// Abre o portal do assinante (trocar plano, cartão, faturas, cancelar).
import { cors, json, obterClienteStripe, PORTAL_CONFIG, stripe, urlRetorno, usuarioDaRequisicao } from "../_shared/comum.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "Método não permitido" }, 405);
  try {
    const user = await usuarioDaRequisicao(req);
    if (!user) return json({ erro: "Faça login." }, 401);
    const { destino } = await req.json().catch(() => ({}));
    const customer = await obterClienteStripe(user.id, user.email);
    const portal = await stripe.billingPortal.sessions.create({
      customer, configuration: PORTAL_CONFIG, return_url: urlRetorno(destino, "portal"), locale: "pt-BR",
    });
    return json({ url: portal.url });
  } catch (e) {
    console.error("stripe-portal", e);
    return json({ erro: "Não foi possível abrir o portal." }, 500);
  }
});
