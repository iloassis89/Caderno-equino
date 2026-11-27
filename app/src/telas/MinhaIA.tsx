// Minha IA: a pessoa pode usar a própria conta de IA (Gemini é grátis no Google AI Studio).
// A chave vai direto para o cofre do servidor e nunca volta para o celular.
import React, { useState } from "react";
import { Linking, Text, View } from "react-native";
import { chamarFuncao } from "../supabase";
import { useCarga } from "../dados";
import { Aviso, Botao, BotaoConfirmar, Cabecalho, Campo, Carregando, Cartao, Escolha, Icone, Tela } from "../ui";
import { cor, est } from "../tema";

const PROVEDORES = [
  { valor: "gemini", rotulo: "Google Gemini (tem plano grátis)", icone: "google", link: "https://aistudio.google.com/apikey",
    passos: ["Toque em “Abrir o site” e entre com sua conta Google.", "Toque em “Create API key” (Criar chave).", "Copie a chave (começa com AIza) e cole abaixo."] },
  { valor: "openai", rotulo: "ChatGPT (OpenAI)", icone: "robot-outline", link: "https://platform.openai.com/api-keys",
    passos: ["Toque em “Abrir o site” e entre na sua conta.", "Toque em “Create new secret key”.", "Copie a chave (começa com sk-) e cole abaixo. A OpenAI cobra pelo uso."] },
  { valor: "anthropic", rotulo: "Claude (Anthropic)", icone: "robot-happy-outline", link: "https://platform.claude.com/settings/keys",
    passos: ["Toque em “Abrir o site” e entre na sua conta.", "Toque em “Create Key”.", "Copie a chave (começa com sk-ant-) e cole abaixo. É pré-pago."] },
];
const nome = (v?: string) => PROVEDORES.find((p) => p.valor === v)?.rotulo.replace(" (tem plano grátis)", "") ?? v;

export default function MinhaIA() {
  const st = useCarga(async () => {
    const { data, erro } = await chamarFuncao<{ conta: { provedor: string; dica: string; criado_em: string } | null; ia_do_app: boolean }>("ia-conta", { acao: "status" });
    if (erro) throw new Error(erro);
    return data!;
  });
  const [provedor, setProvedor] = useState<string | null>("gemini");
  const [chave, setChave] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState<{ t: string; tipo: "ok" | "erro" } | null>(null);
  const p = PROVEDORES.find((x) => x.valor === provedor);

  async function vincular() {
    if (!provedor || ocupado) return;
    setMsg(null);
    if (!chave.trim()) return setMsg({ t: "Cole a chave.", tipo: "erro" });
    setOcupado(true);
    const { erro } = await chamarFuncao("ia-conta", { acao: "vincular", provedor, chave: chave.trim() });
    setOcupado(false);
    if (erro) return setMsg({ t: erro, tipo: "erro" });
    setChave("");
    setMsg({ t: "Pronto! Sua IA foi vinculada e testada.", tipo: "ok" });
    st.recarregar();
  }

  if (st.carregando && !st.dados) return <Tela titulo="Minha IA" voltar><Carregando /></Tela>;
  const conta = st.dados?.conta;
  return (
    <Tela titulo="Minha IA" voltar subtitulo="O assistente e a avaliação da alimentação podem usar a sua própria conta de IA, sem o limite diário do app.">
      <Aviso texto={st.erro} tipo="erro" />
      {conta ? (
        <Cartao style={{ backgroundColor: cor.mataClara, borderColor: cor.mata }}>
          <View style={[est.linha, { gap: 10 }]}>
            <Icone nome="check-decagram" tamanho={32} cor={cor.mata} />
            <View style={{ flex: 1 }}>
              <Text style={[est.texto, { fontWeight: "700" }]}>Usando: {nome(conta.provedor)}</Text>
              <Text style={est.textoSuave}>Chave terminada em …{conta.dica}</Text>
            </View>
          </View>
          <BotaoConfirmar titulo="Desvincular" icone="link-off" onConfirmar={async () => {
            const { erro } = await chamarFuncao("ia-conta", { acao: "desvincular" });
            if (erro) return setMsg({ t: erro, tipo: "erro" });
            setMsg({ t: "Desvinculada. O app volta a usar a IA dele, com limite por dia.", tipo: "ok" });
            st.recarregar();
          }} />
        </Cartao>
      ) : (
        <Cartao>
          <Text style={est.texto}>
            {st.dados?.ia_do_app ? "Hoje você usa a IA do app: 5 perguntas por dia no plano grátis e 30 no pago." : "A IA do app ainda não está ligada. Vincule a sua para usar o assistente."}
          </Text>
        </Cartao>
      )}

      <Cabecalho texto={conta ? "Trocar de IA" : "Vincular a minha IA"} />
      <Escolha valor={provedor} aoEscolher={setProvedor} opcoes={PROVEDORES} colunas={1} />
      {p && (
        <Cartao>
          {p.passos.map((t, i) => <Text key={i} style={[est.texto, { marginBottom: 4 }]}>{i + 1}. {t}</Text>)}
          <Botao titulo="Abrir o site" tipo="leve" icone="open-in-new" onPress={() => Linking.openURL(p.link)} />
        </Cartao>
      )}
      <Campo rotulo="Cole a chave aqui" value={chave} onChangeText={setChave} senha autoCapitalize="none" autoCorrect={false} />
      <Aviso texto={msg?.t} tipo={msg?.tipo} />
      <Botao titulo="Vincular e testar" icone="link-variant" onPress={vincular} carregando={ocupado} />
      <Text style={[est.textoSuave, { marginTop: 12 }]}>
        A chave fica guardada com criptografia no servidor e nunca aparece de novo no celular. O que você pergunta vai para a empresa da IA escolhida. Você pode desvincular quando quiser.
      </Text>
    </Tela>
  );
}
