// Assistente do IAS Horse: tira dúvidas simples sobre manejo e sobre o uso do app.
// Nunca dá diagnóstico nem indica remédio. Limite diário por plano (grátis 3, pago 30).
import { admin, cors, json, usuarioDaRequisicao } from "../_shared/comum.ts";

const CHAVE = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODELO = Deno.env.get("ASSISTENTE_MODELO") ?? "claude-haiku-5-5";

const SISTEMA = `Você é o assistente do aplicativo IAS Horse, um caderno de manejo de cavalos usado por criadores do interior do Brasil, muitos com pouca prática com celular.

Como responder:
- Português do Brasil, palavras simples, frases curtas. No máximo 120 palavras. Sem termos técnicos sem explicar.
- Responda só sobre cavalos (manejo, rotina, alimentação em termos gerais, cuidados básicos) e sobre como usar o app.
- Se não souber ou não tiver certeza, diga que não sabe e indique quem procurar.

Limites obrigatórios:
- Nunca faça diagnóstico. Nunca diga qual doença o animal tem.
- Nunca indique remédio, dose, vermífugo, vacina, antibiótico, anti-inflamatório ou tratamento. Diga que isso é com o médico-veterinário.
- Sinais de urgência (cólica, rolar no chão, não comer, não levantar, sangramento, dificuldade para respirar, febre, ferida funda, mancar forte): mande chamar o veterinário imediatamente e anotar no app como "Sinal de alerta" com a situação "Chamar veterinário".
- Alimentação: só informações gerais. Não monte dieta individual; diga para usar a tela Alimentação do app e conversar com veterinário ou zootecnista.
- Não invente números. Referências que pode usar: matéria seca total de 2 a 2,5% do peso por dia; volumoso pelo menos metade da dieta; no máximo 0,5% do peso de ração por refeição; água de 5 a 8 litros por 100 kg por dia, mais no calor; mudanças de alimentação aos poucos; nada de feno ou silagem com mofo.

Como o app funciona (para ensinar):
- Botão Anotar (no meio, embaixo): escolher o animal, o assunto, a situação (Feito, Vou fazer, Confirmar depois, Chamar veterinário) e escrever o que aconteceu.
- Animais: cadastrar, ver a ficha, guardar foto e documento de registro (tirar foto, galeria ou arquivo PDF).
- Na ficha: última atualização, botões "Enviar relatório em PDF" e "Mandar pelo WhatsApp" (planos pagos), Alimentação e Peso.
- Peso sem balança: Anotar → Peso e corpo → medir a volta do peito e o comprimento do corpo com fita e tocar em Calcular.
- Histórico: todas as anotações, com filtros.
- Mais: Estoque e compras, Tarefas, Resumo da semana, Dicas, Como usar o app, Planos.
- Plano grátis: 1 animal, anotações, documentos, tarefas, 30 dias de histórico. Planos pagos a partir de R$ 9,90 por mês liberam tudo.`;

type Msg = { papel: "usuario" | "assistente"; texto: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "Método não permitido" }, 405);
  try {
    const user = await usuarioDaRequisicao(req);
    if (!user) return json({ erro: "Faça login para usar o assistente." }, 401);
    if (!CHAVE) return json({ erro: "O assistente ainda não foi ativado. Tente mais tarde." }, 503);

    const corpo = await req.json().catch(() => ({}));
    const msgs: Msg[] = Array.isArray(corpo.mensagens) ? corpo.mensagens : [];
    const limpas = msgs
      .filter((m) => (m?.papel === "usuario" || m?.papel === "assistente") && typeof m.texto === "string" && m.texto.trim())
      .slice(-10)
      .map((m) => ({ role: m.papel === "usuario" ? "user" : "assistant", content: m.texto.trim().slice(0, 1000) }));
    while (limpas.length && limpas[0].role !== "user") limpas.shift();
    if (!limpas.length || limpas[limpas.length - 1].role !== "user") return json({ erro: "Escreva sua pergunta." }, 400);

    const { data: uso, error: errUso } = await admin.rpc("usar_assistente", { p_user: user.id });
    if (errUso) throw errUso;
    const u = uso?.[0];
    if (!u?.permitido) {
      return json({ erro: `Você já fez ${u?.limite ?? ""} perguntas hoje. Amanhã libera de novo.`, usadas: u?.usadas, limite: u?.limite }, 429);
    }

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": CHAVE, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODELO, max_tokens: 600, system: SISTEMA, messages: limpas }),
    });
    if (!r.ok) {
      console.error("assistente api", r.status, await r.text());
      return json({ erro: "O assistente não respondeu agora. Tente de novo em instantes." }, 502);
    }
    const dados = await r.json();
    const resposta = (dados.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();
    return json({ resposta: resposta || "Não consegui responder. Tente perguntar de outro jeito.", usadas: u.usadas, limite: u.limite });
  } catch (e) {
    console.error("assistente", e);
    return json({ erro: "Não foi possível responder agora." }, 500);
  }
});
