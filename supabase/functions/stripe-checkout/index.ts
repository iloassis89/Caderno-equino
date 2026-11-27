// Abre o pagamento da assinatura no Stripe Checkout.
// Se o usuário já tem assinatura ativa pelo Stripe, abre o portal para trocar de plano.
import {
  admin, cors, json, obterClienteStripe, PLANOS_PAGOS, PORTAL_CONFIG, stripe, urlRetorno, usuarioDaRequisicao,
} from "../_shared/comum.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "Método não permitido" }, 405);

  try {
    const user = await usuarioDaRequisicao(req);
    if (!user) return json({ erro: "Faça login para assinar." }, 401);

    const { plan_code, destino } = await req.json().catch(() => ({}));
    if (!PLANOS_PAGOS.has(plan_code)) return json({ erro: "Plano inválido." }, 400);

    const customer = await obterClienteStripe(user.id, user.email);

    const { data: ativa } = await admin.from("subscriptions")
      .select("id").eq("user_id", user.id).eq("fonte", "stripe").in("status", ["ativa", "em_atraso"]).limit(1);
    if (ativa && ativa.length > 0) {
      const portal = await stripe.billingPortal.sessions.create({
        customer, configuration: PORTAL_CONFIG, return_url: urlRetorno(destino, "portal"), locale: "pt-BR",
      });
      return json({ url: portal.url, tipo: "portal" });
    }

    const produto = await stripe.products.retrieve(`ce_${plan_code}`);
    const price = typeof produto.default_price === "string" ? produto.default_price : produto.default_price?.id;
    if (!price) return json({ erro: "Plano sem preço configurado." }, 500);

    // Desconto vitalício do cupom de influenciador (vínculo gravado no banco)
    const { data: vinculo } = await admin.from("referrals")
      .select("desconto_pct").eq("customer_id", user.id).maybeSingle();
    const discounts = vinculo && vinculo.desconto_pct > 0
      ? [{ coupon: `ce_afiliado_${vinculo.desconto_pct}` }]
      : undefined;

    const sessao = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: user.id,
      line_items: [{ price, quantity: 1 }],
      discounts,
      locale: "pt-BR",
      success_url: urlRetorno(destino, "sucesso"),
      cancel_url: urlRetorno(destino, "cancelado"),
      metadata: { user_id: user.id, plan_code },
      subscription_data: { metadata: { user_id: user.id, plan_code } },
    });
    return json({ url: sessao.url, tipo: "checkout" });
  } catch (e) {
    console.error("stripe-checkout", e);
    return json({ erro: "Não foi possível iniciar o pagamento." }, 500);
  }
});
