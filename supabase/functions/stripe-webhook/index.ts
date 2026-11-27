// Recebe avisos do Stripe: atualiza o plano do usuário e lança comissões de influenciadores.
import Stripe from "npm:stripe@^18.0.0";
import { admin, stripe } from "../_shared/comum.ts";

const cryptoProvider = Stripe.createSubtleCryptoProvider();
const SEGREDO = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

function idDe(x: unknown): string | null {
  if (!x) return null;
  if (typeof x === "string") return x;
  return (x as { id?: string }).id ?? null;
}

async function usuarioDoCliente(customerId: string | null) {
  if (!customerId) return null;
  const { data } = await admin.from("stripe_customers")
    .select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
  return (data?.user_id as string) ?? null;
}

function statusInterno(s: string) {
  switch (s) {
    case "active":
    case "trialing":
      return "ativa";
    case "past_due":
      return "em_atraso";
    case "canceled":
      return "cancelada";
    case "incomplete":
      return null; // ainda não pago: não libera nada
    default:
      return "expirada"; // unpaid, incomplete_expired, paused
  }
}

async function sincronizarAssinatura(subscriptionId: string) {
  // Sempre lê o estado atual no Stripe, para não depender da ordem dos avisos
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const status = statusInterno(sub.status);
  if (!status) return;

  const customerId = idDe(sub.customer);
  const userId = (sub.metadata?.user_id as string) || await usuarioDoCliente(customerId);
  if (!userId) throw new Error(`Assinatura ${sub.id} sem usuário vinculado`);

  const item = sub.items.data[0];
  const produto = idDe(item.price.product) ?? "";
  const planCode = (item.price.metadata?.plan_code as string) || produto.replace(/^ce_/, "");
  // deno-lint-ignore no-explicit-any
  const fim = (item as any).current_period_end ?? (sub as any).current_period_end;

  const { error } = await admin.from("subscriptions").upsert({
    user_id: userId,
    plan_code: planCode,
    fonte: "stripe",
    status,
    id_externo: sub.id,
    periodo_fim: fim ? new Date(fim * 1000).toISOString() : null,
  }, { onConflict: "fonte,id_externo" });
  if (error) throw error;
}

// deno-lint-ignore no-explicit-any
async function pagamentoDaFatura(inv: any): Promise<string | null> {
  if (inv.payment_intent) return idDe(inv.payment_intent);
  try {
    const pagamentos = await stripe.invoicePayments.list({ invoice: inv.id, limit: 5 });
    for (const p of pagamentos.data) {
      // deno-lint-ignore no-explicit-any
      const pi = idDe((p as any).payment?.payment_intent);
      if (pi && p.status === "paid") return pi;
    }
  } catch (e) {
    console.error("invoicePayments", e);
  }
  return null;
}

// deno-lint-ignore no-explicit-any
async function registrarFatura(inv: any) {
  if (!inv.amount_paid || inv.amount_paid <= 0) return;
  const customerId = idDe(inv.customer);
  const userId = await usuarioDoCliente(customerId);
  if (!userId) return;

  const subId = idDe(inv.parent?.subscription_details?.subscription) ?? idDe(inv.subscription);
  const pi = await pagamentoDaFatura(inv);
  if (!pi) throw new Error(`Fatura ${inv.id} sem pagamento identificado`);

  const intent = await stripe.paymentIntents.retrieve(pi, { expand: ["latest_charge.balance_transaction"] });
  // deno-lint-ignore no-explicit-any
  const bt = (intent.latest_charge as any)?.balance_transaction;
  if (!bt || typeof bt === "string") throw new Error(`Taxa ainda indisponível para ${pi}`); // Stripe reenvia depois
  const taxa = bt.fee as number;

  let subscriptionUuid: string | null = null;
  if (subId) {
    const { data } = await admin.from("subscriptions")
      .select("id").eq("fonte", "stripe").eq("id_externo", subId).maybeSingle();
    subscriptionUuid = (data?.id as string) ?? null;
  }

  const inicio = inv.lines?.data?.[0]?.period?.start ?? inv.period_start ?? inv.created;
  const competencia = new Date(inicio * 1000).toISOString().slice(0, 10);

  const { error } = await admin.rpc("registrar_comissao", {
    p_customer: userId,
    p_fonte: "stripe",
    p_evento: inv.id,
    p_competencia: competencia,
    p_valor_pago: inv.amount_paid,
    p_taxa: taxa,
    p_subscription: subscriptionUuid,
    p_pagamento_ref: pi,
  });
  if (error) throw error;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Método não permitido", { status: 405 });
  const assinatura = req.headers.get("Stripe-Signature");
  const corpo = await req.text();

  let evento: Stripe.Event;
  try {
    evento = await stripe.webhooks.constructEventAsync(corpo, assinatura ?? "", SEGREDO, undefined, cryptoProvider);
  } catch (e) {
    console.error("Assinatura do webhook inválida", e);
    return new Response("Assinatura inválida", { status: 400 });
  }

  try {
    switch (evento.type) {
      case "checkout.session.completed": {
        // deno-lint-ignore no-explicit-any
        const s = evento.data.object as any;
        const customerId = idDe(s.customer);
        if (s.client_reference_id && customerId) {
          await admin.from("stripe_customers").upsert(
            { user_id: s.client_reference_id, stripe_customer_id: customerId },
            { onConflict: "user_id", ignoreDuplicates: true },
          );
        }
        const subId = idDe(s.subscription);
        if (s.mode === "subscription" && subId) await sincronizarAssinatura(subId);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await sincronizarAssinatura(evento.data.object.id);
        break;
      case "invoice.paid":
        await registrarFatura(evento.data.object);
        break;
      case "charge.refunded": {
        const ch = evento.data.object;
        const pi = idDe(ch.payment_intent);
        if (pi) await admin.rpc("estornar_comissao_por_pagamento", { p_fonte: "stripe", p_pagamento_ref: pi });
        break;
      }
    }
    return new Response(JSON.stringify({ recebido: true }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error(`Erro ao tratar ${evento.type} (${evento.id})`, e);
    return new Response("Erro ao processar", { status: 500 }); // o Stripe tenta de novo
  }
});
