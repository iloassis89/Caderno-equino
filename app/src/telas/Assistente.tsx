// Consulta rápida à IA: uma pergunta, uma resposta. Sem memória e nada fica guardado,
// a não ser que a pessoa toque em "Guardar" (vai para "Respostas guardadas" e, se escolher um animal, para o relatório dele).
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { chamarFuncao, supabase } from "../supabase";
import { Aviso, Botao, Campo, Cartao, Escolha, Icone, Tela, Vazio, useNav } from "../ui";
import { useCarga } from "../dados";
import { cor, est, tam } from "../tema";
import { br } from "../datas";

const SUGESTOES = [
  "Quanto de água o cavalo bebe por dia?",
  "Como medir o peso com fita?",
  "De quanto em quanto tempo chamar o ferrador?",
];

type Guardada = { id: string; pergunta: string; resposta: string; created_at: string; animal_id: string | null };

export default function Assistente() {
  const nav = useNav();
  const [texto, setTexto] = useState("");
  const [atual, setAtual] = useState<{ pergunta: string; resposta: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [esperando, setEsperando] = useState(false);
  const [uso, setUso] = useState<{ usadas: number; limite: number } | null>(null);
  const [guardarEm, setGuardarEm] = useState<string | null>("geral");
  const [guardando, setGuardando] = useState(false);
  const [guardou, setGuardou] = useState(false);
  const [verGuardadas, setVerGuardadas] = useState(false);

  const animais = useCarga(async () => {
    const { data } = await supabase.from("animals").select("id,nome").order("nome");
    return (data ?? []) as { id: string; nome: string }[];
  }, []);
  const guardadas = useCarga(async () => {
    const { data } = await supabase.from("consultas_salvas").select("id,pergunta,resposta,created_at,animal_id").order("created_at", { ascending: false }).limit(30);
    return (data ?? []) as Guardada[];
  }, []);

  async function enviar(pergunta?: string) {
    const t = (pergunta ?? texto).trim();
    if (!t || esperando) return;
    setErro(null); setGuardou(false); setEsperando(true);
    const { data, erro: e } = await chamarFuncao<{ resposta: string; usadas: number | null; limite: number | null }>("assistente", { pergunta: t });
    setEsperando(false);
    if (e || !data?.resposta) { setTexto(t); setErro(e ?? "Não foi possível responder agora."); return; }
    setAtual({ pergunta: t, resposta: data.resposta });
    setTexto("");
    setUso(typeof data.usadas === "number" && typeof data.limite === "number" ? { usadas: data.usadas, limite: data.limite } : null);
  }

  async function guardar() {
    if (!atual || guardando) return;
    setGuardando(true); setErro(null);
    const { error } = await supabase.from("consultas_salvas").insert({
      pergunta: atual.pergunta.slice(0, 1000), resposta: atual.resposta.slice(0, 4000),
      animal_id: guardarEm && guardarEm !== "geral" ? guardarEm : null,
    });
    setGuardando(false);
    if (error) return setErro("Não foi possível guardar. Confira a internet e tente de novo.");
    setGuardou(true);
    guardadas.recarregar();
  }

  async function apagar(id: string) {
    await supabase.from("consultas_salvas").delete().eq("id", id);
    guardadas.recarregar();
  }

  const nomeAnimal = (id: string | null) => (id ? animais.dados?.find((a) => a.id === id)?.nome : null);
  const acabou = !!uso && uso.usadas >= uso.limite;

  return (
    <Tela titulo="Pergunte à IA" voltar subtitulo="Uma pergunta por vez, resposta na hora. Ela não guarda a conversa, não dá diagnóstico e não indica remédio.">
      <Aviso texto="Em caso de urgência (cólica, sangramento, animal caído), ligue para o veterinário agora." />

      {!atual && (
        <View style={{ marginBottom: 8 }}>
          <Text style={[est.textoSuave, { marginBottom: 6 }]}>Toque numa pergunta ou escreva a sua:</Text>
          {SUGESTOES.map((s) => <Botao key={s} titulo={s} tipo="leve" onPress={() => enviar(s)} desativado={esperando} />)}
        </View>
      )}

      {atual && (
        <Cartao style={{ borderColor: cor.mata, borderWidth: 2 }}>
          <Text style={[est.textoSuave, { marginBottom: 6 }]}>Você perguntou: {atual.pergunta}</Text>
          <View style={[est.linha, { gap: 6, marginBottom: 4 }]}>
            <Icone nome="horse-variant" tamanho={18} cor={cor.mata} />
            <Text style={{ color: cor.mata, fontWeight: "700", fontSize: 15 }}>Resposta</Text>
          </View>
          <Text style={{ color: cor.tinta, fontSize: tam.texto, lineHeight: 26 }}>{atual.resposta}</Text>
          {guardou ? (
            <Aviso texto="Guardada. Está em “Respostas guardadas” aqui embaixo." tipo="ok" />
          ) : (
            <View style={{ marginTop: 10 }}>
              <Text style={[est.textoSuave, { marginBottom: 4 }]}>Quer guardar? Se não guardar, ela some quando você sair desta tela.</Text>
              {(animais.dados?.length ?? 0) > 0 && (
                <Escolha rotulo="Guardar em" valor={guardarEm} aoEscolher={setGuardarEm} colunas={2}
                  opcoes={[{ valor: "geral", rotulo: "Geral" }, ...(animais.dados ?? []).map((a) => ({ valor: a.id, rotulo: a.nome }))]} />
              )}
              <Botao titulo="Guardar esta resposta" icone="content-save-outline" tipo="secundario" onPress={guardar} carregando={guardando} />
            </View>
          )}
        </Cartao>
      )}

      {esperando && <Text style={[est.textoSuave, { marginVertical: 8 }]}>A IA está respondendo…</Text>}
      <Aviso texto={erro} tipo="erro" />

      {!acabou && (
        <>
          <Campo rotulo={atual ? "Outra pergunta" : "Sua pergunta"} value={texto} onChangeText={setTexto} multiline maxLength={1000} placeholder="Escreva aqui" />
          <Botao titulo="Perguntar" icone="send" onPress={() => enviar()} carregando={esperando} desativado={!texto.trim()} />
        </>
      )}
      {uso && (
        <Text style={[est.textoSuave, { marginTop: 8 }]}>
          Perguntas hoje: {uso.usadas} de {uso.limite}.{acabou ? " Amanhã libera de novo." : ""}
        </Text>
      )}
      {acabou && (
        <Pressable onPress={() => nav.ir("Planos")} style={{ minHeight: 48, justifyContent: "center" }}>
          <Text style={{ color: cor.couro, fontSize: tam.pequeno, fontWeight: "700" }}>Quer perguntar mais por dia? Veja os planos →</Text>
        </Pressable>
      )}
      <Text style={[est.textoSuave, { marginTop: 8, fontSize: 15 }]}>
        Respostas de inteligência artificial podem errar: confirme com o veterinário. Não escreva nome, telefone, CPF ou endereço na pergunta.
      </Text>

      <Botao titulo={verGuardadas ? "Esconder respostas guardadas" : `Respostas guardadas (${guardadas.dados?.length ?? 0})`}
        tipo="leve" icone="bookmark-outline" onPress={() => setVerGuardadas(!verGuardadas)} />
      {verGuardadas && (
        (guardadas.dados?.length ?? 0) === 0 ? <Vazio texto="Nenhuma resposta guardada ainda." /> :
          guardadas.dados!.map((g) => (
            <Cartao key={g.id}>
              <Text style={[est.textoSuave, { marginBottom: 4 }]}>{br(g.created_at.slice(0, 10))}{nomeAnimal(g.animal_id) ? ` · ${nomeAnimal(g.animal_id)}` : ""}</Text>
              <Text style={[est.texto, { fontWeight: "700", marginBottom: 4 }]}>{g.pergunta}</Text>
              <Text style={est.texto}>{g.resposta}</Text>
              <Pressable onPress={() => apagar(g.id)} style={{ minHeight: 44, justifyContent: "center" }}>
                <Text style={{ color: cor.barro, fontSize: tam.pequeno, fontWeight: "700" }}>Apagar</Text>
              </Pressable>
            </Cartao>
          ))
      )}
    </Tela>
  );
}
