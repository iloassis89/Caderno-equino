// Pagamento à vista ou Pix pela InfinitePay (dinheiro cai direto na conta do Ilo).
// - acao "criar": monta o valor (plano × período − cupom) no servidor e gera o link.
// - acao "confirmar": a pessoa voltou do pagamento; confere na InfinitePay e libera.
// - ?webhook=1: aviso da InfinitePay (sem assinatura) → sempre confere no /payment_check antes de liberar.
import { admin, cors, json, usuarioDaRequisicao } from "../_shared/comum.ts";

const API = "https://api.checkout.infinitepay.io";
const CHAVE = Deno.env.get("INFINITEPAY_API_KEY") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "https://iashorse.pages.dev/";
const FUNCAO_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/infinitepay`;
const NOMES: Record<number, string> = { 1: "1 mês", 3: "3 meses", 6: "6 meses", 12: "12 meses" };

async function handle(): Promise<string> {
  const doSegredo = (Deno.env.get("INFINITEPAY_HANDLE") ?? "").replace(/^\$/, "").trim();
  if (doSegredo) return doSegredo;
  const { data } = await admin.from("configuracoes").select("valor").eq("chave", "infinitepay_handle").maybeSingle();
  return typeof data?.valor === "string" ? data.valor.replace(/^\$/, "").trim() : "";
}

function urlDoLink(r: any): string | null {
  const candidatos = [r?.url, r?.link, r?.checkout_url, r?.payment_url, r?.data?.url, r?.data?.link, r?.data?.checkout_url];
  const u = candidatos.find((x) => typeof x === "string" && /^https:\/\//.test(x));
  return u ?? null;
}

/** Confere na InfinitePay e, se pago, libera o plano. */
async function conferirEAtivar(pagamentoId: string, slug: string, transacao: string) {
  const { data: pg } = await admin.from("pagamentos").select("*").eq("id", pagamentoId).maybeSingle();
  if (!pg) return { ok: false, motivo: "não encontrado" };
  if (pg.status === "pago") return { ok: true, ja: true };
  const h = await handle();
  const r = await fetch(`${API}/payment_check`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(CHAVE ? { "X-Api-Key": CHAVE } : {}) },
    body: JSON.stringify({ handle: h, order_nsu: pg.id, transaction_nsu: transacao, slug }),
  });
  const c = await r.json().catch(() => ({}));
  if (!r.ok || !c?.success || !c?.paid) return { ok: false, motivo: "não pago ainda" };
  if (Number(c.amount) < pg.valor_centavos) {
    console.error("valor menor que o esperado", pg.id, c.amount, pg.valor_centavos);
    return { ok: false, motivo: "valor diferente" };
  }
  const { data: at, error } = await admin.rpc("ativar_pagamento", {
    p_id: pg.id, p_slug: slug, p_transaction: transacao, p_capture: String(c.capture_method ?? ""),
    p_paid: Number(c.paid_amount ?? c.amount), p_installments: Number(c.installments ?? 1),
  });
  if (error) throw error;
  return { ok: true, periodo_fim: at?.[0]?.periodo_fim };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "Método não permitido" }, 405);
  const url = new URL(req.url);
  try {
    // ---- aviso da InfinitePay ----
    if (url.searchParams.get("webhook") === "1") {
      const b = await req.json().catch(() => ({}));
      const id = String(b?.order_nsu ?? "");
      const slug = String(b?.invoice_slug ?? b?.slug ?? "");
      const tx = String(b?.transaction_nsu ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(id) || !slug || !tx) return json({ ok: true }); // nada a fazer
      const r = await conferirEAtivar(id, slug, tx);
      if (!r.ok && r.motivo === "não pago ainda") return json({ ok: true });
      return json({ ok: true });
    }

    const user = await usuarioDaRequisicao(req);
    if (!user) return json({ erro: "Faça login." }, 401);
    const corpo = await req.json().catch(() => ({}));

    if (corpo.acao === "confirmar") {
      const id = String(corpo.pagamento_id ?? "");
      const { data: pg } = await admin.from("pagamentos").select("id,user_id,status").eq("id", id).maybeSingle();
      if (!pg || pg.user_id !== user.id) return json({ erro: "Pagamento não encontrado." }, 404);
      if (pg.status === "pago") return json({ pago: true });
      if (!corpo.slug || !corpo.transaction_nsu) return json({ pago: false });
      const r = await conferirEAtivar(id, String(corpo.slug), String(corpo.transaction_nsu));
      return json({ pago: r.ok, periodo_fim: (r as any).periodo_fim ?? null });
    }

    if (corpo.acao === "criar") {
      const h = await handle();
      if (!h && !CHAVE) return json({ erro: "O pagamento por Pix ainda não foi ativado. Tente o cartão ou fale com o suporte." }, 503);
      const meses = Number(corpo.meses);
      const { data: preco } = await admin.from("planos_periodos").select("preco_centavos").eq("plan_code", String(corpo.plan_code ?? "")).eq("meses", meses).maybeSingle();
      if (!preco) return json({ erro: "Plano inválido." }, 400);
      const { data: ref } = await admin.from("referrals").select("desconto_pct").eq("customer_id", user.id).maybeSingle();
      const desconto = Math.min(Math.max(Number(ref?.desconto_pct ?? 0), 0), 50);
      const valor = Math.max(Math.round(preco.preco_centavos * (1 - desconto / 100)), 100);
      const { data: plano } = await admin.from("plans").select("nome").eq("code", corpo.plan_code).single();

      const { data: pg, error } = await admin.from("pagamentos").insert({
        user_id: user.id, plan_code: corpo.plan_code, meses, valor_cheio_centavos: preco.preco_centavos, desconto_pct: desconto, valor_centavos: valor,
      }).select("id").single();
      if (error) throw error;

      const descricao = `IAS Horse — ${plano?.nome ?? corpo.plan_code} — ${NOMES[meses] ?? `${meses} meses`}${desconto ? ` (cupom ${desconto}%)` : ""}`;
      const validade = new Date(Date.now() + 2 * 86400000).toISOString();
      const body: Record<string, unknown> = {
        ...(h ? { handle: h } : {}),
        items: [{ quantity: 1, price: valor, description: descricao.slice(0, 120) }],
        order_nsu: pg.id,
        redirect_url: `${APP_URL}?pagamento=${pg.id}`,
        webhook_url: `${FUNCAO_URL}?webhook=1`,
        customer: { email: user.email ?? undefined },
        // com a chave: Pix ligado; à vista sem juros para o cliente; parcelado com juros pagos pelo cliente
        ...(CHAVE ? { options: { payment_methods_enabled: ["credit_card", "pix"], assured_installments: 1, single_payment: true, valid_until: validade } } : {}),
      };
      const r = await fetch(`${API}/links`, {
        method: "POST",
        headers: { "content-type": "application/json", ...(CHAVE ? { "X-Api-Key": CHAVE } : {}) },
        body: JSON.stringify(body),
      });
      const resposta = await r.json().catch(() => ({}));
      const link = urlDoLink(resposta);
      await admin.from("pagamentos").update({ resposta, link_url: link, ...(r.ok && link ? {} : { status: "cancelado" }) }).eq("id", pg.id);
      if (!r.ok || !link) {
        console.error("infinitepay links", r.status, JSON.stringify(resposta).slice(0, 500));
        return json({ erro: "Não foi possível gerar o pagamento agora. Tente de novo em instantes." }, 502);
      }
      return json({ url: link, pagamento_id: pg.id, valor_centavos: valor, desconto_pct: desconto });
    }
    return json({ erro: "Ação desconhecida." }, 400);
  } catch (e) {
    console.error("infinitepay", e);
    return json({ erro: "Não foi possível agora. Tente de novo." }, 500);
  }
});
