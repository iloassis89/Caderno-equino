// Vincular a conta de IA da própria pessoa (a chave fica criptografada no cofre do banco e nunca volta para o app).
import { admin, cors, json, usuarioDaRequisicao } from "../_shared/comum.ts";
import { ErroIA, NOME_PROVEDOR, perguntarIA, type Provedor } from "../_shared/ia.ts";

const FORMATO: Record<Provedor, RegExp> = {
  gemini: /^AIza[0-9A-Za-z_\-]{30,}$/,
  openai: /^sk-[0-9A-Za-z_\-]{20,}$/,
  anthropic: /^sk-ant-[0-9A-Za-z_\-]{20,}$/,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "Método não permitido" }, 405);
  try {
    const user = await usuarioDaRequisicao(req);
    if (!user) return json({ erro: "Faça login." }, 401);
    const corpo = await req.json().catch(() => ({}));

    if (corpo.acao === "status") {
      const { data } = await admin.from("ia_contas").select("provedor,dica,criado_em").eq("user_id", user.id).maybeSingle();
      return json({ conta: data ?? null, ia_do_app: !!Deno.env.get("ANTHROPIC_API_KEY") });
    }

    if (corpo.acao === "desvincular") {
      await admin.rpc("apagar_chave_ia", { p_user: user.id });
      return json({ ok: true });
    }

    if (corpo.acao === "vincular") {
      const provedor = corpo.provedor as Provedor;
      if (!(provedor in FORMATO)) return json({ erro: "Escolha a IA." }, 400);
      const chave = typeof corpo.chave === "string" ? corpo.chave.trim().replace(/\s+/g, "") : "";
      if (!FORMATO[provedor].test(chave)) {
        return json({ erro: `Essa chave não parece ser do ${NOME_PROVEDOR[provedor]}. Copie a chave inteira e cole aqui.` }, 400);
      }
      // testa a chave antes de guardar
      try {
        const r = await perguntarIA({ provedor, chave, propria: true }, "Responda só com a palavra OK.", [{ role: "user", content: "Teste" }], 20);
        if (!r) throw new Error("vazio");
      } catch (e) {
        console.error("teste chave", provedor, e);
        const msg = e instanceof ErroIA && e.chaveInvalida ? "A chave não foi aceita. Confira se copiou inteira."
          : e instanceof ErroIA && e.semSaldo ? "A chave funciona, mas a conta está sem saldo ou sem cota. Veja na sua conta da IA."
          : "Não consegui testar a chave agora. Tente de novo em instantes.";
        return json({ erro: msg }, 400);
      }
      const { error } = await admin.rpc("salvar_chave_ia", { p_user: user.id, p_provedor: provedor, p_chave: chave });
      if (error) throw error;
      return json({ ok: true, provedor, dica: chave.slice(-4) });
    }
    return json({ erro: "Ação desconhecida." }, 400);
  } catch (e) {
    console.error("ia-conta", e);
    return json({ erro: "Não foi possível agora. Tente de novo." }, 500);
  }
});
