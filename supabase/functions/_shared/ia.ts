// Fala com a IA: a do próprio usuário (Gemini, ChatGPT/OpenAI ou Claude/Anthropic) ou, sem ela, a do app.
// A do app usa o plano GRÁTIS do Google Gemini (GEMINI_API_KEY); a Anthropic só entra se não houver Gemini.
import { admin } from "./comum.ts";

export type Provedor = "gemini" | "openai" | "anthropic";
export type MsgIA = { role: "user" | "assistant"; content: string };
export type ContaIA = { provedor: Provedor; chave: string; propria: boolean };

export const NOME_PROVEDOR: Record<Provedor, string> = { gemini: "Google Gemini", openai: "ChatGPT (OpenAI)", anthropic: "Claude (Anthropic)" };

const MODELO: Record<Provedor, string> = {
  gemini: Deno.env.get("IA_MODELO_GEMINI") ?? "gemini-flash-lite-latest",
  openai: Deno.env.get("IA_MODELO_OPENAI") ?? "gpt-5.4-mini",
  anthropic: Deno.env.get("ASSISTENTE_MODELO") ?? "claude-haiku-5-5",
};

/** Conta de IA a usar: a da pessoa (se vinculou) ou a do app. null = nenhuma disponível. */
export async function contaIA(userId: string): Promise<ContaIA | null> {
  const { data } = await admin.rpc("chave_ia", { p_user: userId });
  const c = data?.[0];
  if (c?.chave && c?.provedor) return { provedor: c.provedor, chave: c.chave, propria: true };
  return contaDoApp();
}

/** IA do app: Gemini grátis primeiro; Anthropic (paga) só se não houver Gemini. */
export function contaDoApp(): ContaIA | null {
  const gemini = (Deno.env.get("GEMINI_API_KEY") ?? "").trim();
  if (gemini) return { provedor: "gemini", chave: gemini, propria: false };
  const anthropic = (Deno.env.get("ANTHROPIC_API_KEY") ?? "").trim();
  return anthropic ? { provedor: "anthropic", chave: anthropic, propria: false } : null;
}

export class ErroIA extends Error {
  constructor(public status: number, msg: string, public chaveInvalida = false, public semSaldo = false) { super(msg); }
}

function classificar(status: number, corpo: string): ErroIA {
  const t = corpo.toLowerCase();
  const invalida = status === 401 || status === 403 || /api[_ ]?key|invalid.*key|permission/.test(t) && status === 400;
  const semSaldo = status === 402 || status === 429 && /quota|billing|credit|insufficient/.test(t) || /credit balance|insufficient_quota|billing/.test(t);
  return new ErroIA(status, `IA ${status}: ${corpo.slice(0, 300)}`, invalida, semSaldo);
}

/** Pergunta à IA e devolve só o texto. json = pede resposta em JSON; cache = guarda o texto do sistema (Anthropic) */
export async function perguntarIA(conta: ContaIA, sistema: string, mensagens: MsgIA[], maxTokens = 700, opc: { json?: boolean; cache?: boolean } = {}): Promise<string> {
  const modelo = MODELO[conta.provedor];
  let r: Response;
  if (conta.provedor === "gemini") {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": conta.chave, "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sistema }] },
        contents: mensagens.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        ...(opc.json ? { generationConfig: { responseMimeType: "application/json" } } : {}),
      }),
    });
    if (!r.ok) throw classificar(r.status, await r.text());
    const d = await r.json();
    return (d.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("").trim();
  }
  if (conta.provedor === "openai") {
    r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${conta.chave}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: modelo, max_completion_tokens: Math.max(maxTokens * 3, 2000), reasoning_effort: "low",
        messages: [{ role: "system", content: sistema }, ...mensagens],
        ...(opc.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!r.ok) throw classificar(r.status, await r.text());
    const d = await r.json();
    return String(d.choices?.[0]?.message?.content ?? "").trim();
  }
  r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": conta.chave, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: modelo, max_tokens: maxTokens, messages: mensagens,
      system: opc.cache ? [{ type: "text", text: sistema, cache_control: { type: "ephemeral" } }] : sistema,
    }),
  });
  if (!r.ok) throw classificar(r.status, await r.text());
  const d = await r.json();
  return (d.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();
}

/** Tira marcas de formatação que confundem quem não está acostumado */
export function textoSimples(t: string) {
  return t.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#{1,6}\s*/gm, "").replace(/^\s*[-*]\s+/gm, "• ").replace(/\*/g, "").trim();
}

/** Mensagem amigável quando a IA da pessoa falha */
export function erroAmigavel(e: unknown, propria: boolean): string {
  if (e instanceof ErroIA && propria) {
    if (e.chaveInvalida) return "A chave da sua IA não funcionou. Vá em Mais → Minha IA e vincule de novo.";
    if (e.semSaldo) return "Sua conta de IA está sem saldo ou atingiu o limite de hoje. Veja na sua conta da IA ou desvincule em Mais → Minha IA para usar a do app.";
  }
  return "A IA não respondeu agora. Tente de novo em instantes.";
}
