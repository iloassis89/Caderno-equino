// Diagnóstico para o administrador: mostra quais chaves estão configuradas (sem mostrar a chave),
// testa a IA do app e manda um e-mail de teste para o e-mail de avisos.
import { admin, cors, json, usuarioDaRequisicao } from "../_shared/comum.ts";
import { perguntarIA } from "../_shared/ia.ts";

async function ehAdmin(user: any) {
  if (!user?.email || !user.email_confirmed_at) return false;
  const { data } = await admin.from("admin_emails").select("email").ilike("email", user.email).maybeSingle();
  return !!data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "Método não permitido" }, 405);
  try {
    const user = await usuarioDaRequisicao(req);
    if (!(await ehAdmin(user))) return json({ erro: "Somente o administrador." }, 403);
    const corpo = await req.json().catch(() => ({}));
    const tem = (n: string) => !!(Deno.env.get(n) ?? "").trim();
    const r: Record<string, unknown> = {
      ia_do_app: tem("ANTHROPIC_API_KEY"), email_brevo: tem("BREVO_API_KEY"), email_resend: tem("RESEND_API_KEY"),
      email_remetente: tem("EMAIL_REMETENTE"), stripe: tem("STRIPE_SECRET_KEY"), stripe_webhook: tem("STRIPE_WEBHOOK_SECRET"),
    };

    if (corpo.testar_ia && r.ia_do_app) {
      try {
        const t = await perguntarIA({ provedor: "anthropic", chave: Deno.env.get("ANTHROPIC_API_KEY")!, propria: false }, "Responda só OK.", [{ role: "user", content: "Teste" }], 10);
        r.teste_ia = t ? "ok" : "sem resposta";
      } catch (e) { r.teste_ia = String((e as Error).message).slice(0, 200); }
    }

    if (corpo.testar_email) {
      const { data } = await admin.from("configuracoes").select("valor").eq("chave", "email_avisos").maybeSingle();
      const para = typeof data?.valor === "string" ? data.valor : null;
      const remetente = Deno.env.get("EMAIL_REMETENTE") ?? "";
      const brevo = Deno.env.get("BREVO_API_KEY") ?? "";
      if (!para || !remetente || !brevo) r.teste_email = "Falta configurar BREVO_API_KEY, EMAIL_REMETENTE ou o e-mail de avisos.";
      else {
        const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": brevo, "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({
            sender: { name: "IAS Horse", email: remetente }, to: [{ email: para }], subject: "[IAS Horse] Teste de e-mail",
            htmlContent: "<p>Funcionou! Os avisos do suporte do IAS Horse vão chegar neste e-mail.</p>",
          }),
        });
        r.teste_email = resp.ok ? `ok (enviado para ${para})` : `Brevo ${resp.status}: ${(await resp.text()).slice(0, 200)}`;
      }
    }
    return json(r);
  } catch (e) {
    console.error("diagnostico", e);
    return json({ erro: "Falhou." }, 500);
  }
});
