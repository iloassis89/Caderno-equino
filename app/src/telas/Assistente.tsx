import React, { useState } from "react";
import { Text, View } from "react-native";
import { chamarFuncao } from "../supabase";
import { Aviso, Botao, Campo, Icone, Tela } from "../ui";
import { cor, est, tam } from "../tema";

type Msg = { papel: "usuario" | "assistente"; texto: string };

const SUGESTOES = [
  "Quanto de água o cavalo bebe por dia?",
  "Como medir o peso com fita?",
  "Como mando o relatório para o veterinário?",
];

export default function Assistente() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [esperando, setEsperando] = useState(false);
  const [uso, setUso] = useState<{ usadas: number; limite: number } | null>(null);

  async function enviar(pergunta?: string) {
    const t = (pergunta ?? texto).trim();
    if (!t || esperando) return;
    setErro(null);
    const novas = [...msgs, { papel: "usuario" as const, texto: t }];
    setMsgs(novas);
    setTexto("");
    setEsperando(true);
    const { data, erro: e } = await chamarFuncao<{ resposta: string; usadas: number; limite: number }>("assistente", { mensagens: novas });
    setEsperando(false);
    if (e || !data?.resposta) { setErro(e ?? "Não foi possível responder agora."); return; }
    setMsgs([...novas, { papel: "assistente", texto: data.resposta }]);
    setUso({ usadas: data.usadas, limite: data.limite });
  }

  return (
    <Tela titulo="Assistente" voltar subtitulo="Pergunte dúvidas simples sobre o cavalo ou sobre o app. Ele não dá diagnóstico nem indica remédio.">
      <Aviso texto="Em caso de urgência (cólica, sangramento, animal caído), ligue para o veterinário agora." />
      {msgs.length === 0 && (
        <View style={{ marginBottom: 8 }}>
          <Text style={[est.textoSuave, { marginBottom: 6 }]}>Toque numa pergunta ou escreva a sua:</Text>
          {SUGESTOES.map((s) => <Botao key={s} titulo={s} tipo="leve" onPress={() => enviar(s)} />)}
        </View>
      )}
      {msgs.map((m, n) => (
        <View key={n} style={{
          alignSelf: m.papel === "usuario" ? "flex-end" : "flex-start", maxWidth: "90%", marginVertical: 6,
          backgroundColor: m.papel === "usuario" ? cor.mata : cor.cartao, borderRadius: 14, padding: 12,
          borderWidth: m.papel === "usuario" ? 0 : 1, borderColor: cor.linha,
        }}>
          {m.papel === "assistente" && (
            <View style={[est.linha, { gap: 6, marginBottom: 4 }]}>
              <Icone nome="horse-variant" tamanho={18} cor={cor.mata} />
              <Text style={{ color: cor.mata, fontWeight: "700", fontSize: 14 }}>Assistente</Text>
            </View>
          )}
          <Text style={{ color: m.papel === "usuario" ? cor.branco : cor.tinta, fontSize: tam.texto, lineHeight: 26 }}>{m.texto}</Text>
        </View>
      ))}
      {esperando && <Text style={[est.textoSuave, { marginVertical: 8 }]}>O assistente está escrevendo…</Text>}
      <Aviso texto={erro} tipo="erro" />
      <Campo rotulo="Sua pergunta" value={texto} onChangeText={setTexto} multiline placeholder="Escreva aqui" />
      <Botao titulo="Perguntar" icone="send" onPress={() => enviar()} carregando={esperando} desativado={!texto.trim()} />
      {uso && <Text style={[est.textoSuave, { marginTop: 8 }]}>Perguntas hoje: {uso.usadas} de {uso.limite}.</Text>}
      <Text style={[est.textoSuave, { marginTop: 8, fontSize: 13 }]}>As respostas são geradas por inteligência artificial e podem conter erros. Confirme com o veterinário.</Text>
    </Tela>
  );
}
