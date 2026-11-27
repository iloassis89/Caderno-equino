import React, { useState } from "react";
import { Text, View } from "react-native";
import { supabase, mensagemErro } from "../supabase";
import { carregarAnimais, useCarga } from "../dados";
import { Aviso, Botao, BotaoConfirmar, Cabecalho, Campo, Carregando, Cartao, Escolha, Tela, Vazio, useNav } from "../ui";
import { RECORRENCIAS, rotuloDe } from "../constantes";
import { br, hojeISO, mascaraData, paraISO, proximaData } from "../datas";
import { cor, est } from "../tema";

export function Tarefas() {
  const nav = useNav();
  const [msg, setMsg] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const { dados, carregando, recarregar } = useCarga(async () => {
    const [t, ex] = await Promise.all([
      supabase.from("tasks").select("*, animals(nome)").eq("ativo", true).order("proxima_data", { nullsFirst: false }),
      supabase.from("task_runs").select("*, tasks(titulo)").order("data", { ascending: false }).limit(15),
    ]);
    return { tarefas: t.data ?? [], execucoes: ex.data ?? [] };
  });
  const hoje = hojeISO();

  async function concluir(t: any) {
    if (ocupado) return;
    setMsg(null); setOcupado(t.id);
    try {
      const { error } = await supabase.from("task_runs").insert({ task_id: t.id, data: hoje, responsavel: t.responsavel });
      if (error) return setMsg(mensagemErro(error));
      const prox = proximaData(hoje, t.recorrencia, t.intervalo ?? 1);
      const up = await supabase.from("tasks").update(prox ? { proxima_data: prox } : { ativo: false }).eq("id", t.id);
      if (up.error) return setMsg(mensagemErro(up.error));
      setMsg(`"${t.titulo}" marcada como feita hoje.${prox ? ` Próxima vez: ${br(prox)}.` : ""}`);
      recarregar();
    } finally { setOcupado(null); }
  }

  if (carregando && !dados) return <Tela titulo="Tarefas"><Carregando /></Tela>;
  return (
    <Tela titulo="Tarefas" voltar subtitulo="Cuidados que se repetem. Toque em “Feita hoje” e o app marca a próxima data.">
      <Botao titulo="Nova tarefa" icone="plus-circle" onPress={() => nav.ir("NovaTarefa")} />
      <Aviso texto={msg} tipo="ok" />
      <Cabecalho texto="Em aberto" />
      {dados!.tarefas.length === 0 ? <Vazio texto="Nenhuma tarefa." /> : dados!.tarefas.map((t: any) => (
        <Cartao key={t.id}>
          <View style={est.entre}>
            <Text style={[est.texto, { fontWeight: "700", flex: 1 }]}>{t.titulo}</Text>
            <Text style={{ color: t.proxima_data && t.proxima_data < hoje ? cor.barro : cor.tintaSuave, fontWeight: "600" }}>{br(t.proxima_data)}</Text>
          </View>
          <Text style={est.textoSuave}>
            {[t.animals?.nome, rotuloDe(RECORRENCIAS, t.recorrencia), t.responsavel].filter(Boolean).join(" · ")}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Botao titulo="Feita hoje" icone="check" style={{ flex: 1 }} onPress={() => concluir(t)} carregando={ocupado === t.id} />
            <View style={{ flex: 1 }}>
              <BotaoConfirmar titulo="Parar" icone="stop-circle-outline" onConfirmar={async () => {
                const { error } = await supabase.from("tasks").update({ ativo: false }).eq("id", t.id);
                if (error) return setMsg(mensagemErro(error));
                recarregar();
              }} />
            </View>
          </View>
        </Cartao>
      ))}
      <Cabecalho texto="Últimas execuções" />
      {dados!.execucoes.length === 0 ? <Vazio texto="Nenhuma execução registrada." /> : dados!.execucoes.map((e: any) => (
        <Text key={e.id} style={[est.texto, { marginBottom: 4 }]}>{br(e.data)} · {e.tasks?.titulo}{e.responsavel ? ` · ${e.responsavel}` : ""}</Text>
      ))}
    </Tela>
  );
}

export function NovaTarefa() {
  const nav = useNav();
  const animais = useCarga(() => carregarAnimais(true));
  const [titulo, setTitulo] = useState("");
  const [animal, setAnimal] = useState<string | null>(null);
  const [rec, setRec] = useState<string | null>("semanal");
  const [data, setData] = useState(br(hojeISO()));
  const [responsavel, setResponsavel] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  async function salvar() {
    setErro(null);
    if (!titulo.trim()) return setErro("Dê um nome à tarefa.");
    const d = paraISO(data);
    if (!d) return setErro("Data inválida.");
    setSalvando(true);
    const { error } = await supabase.from("tasks").insert({
      titulo: titulo.trim(), animal_id: animal, recorrencia: rec ?? "unica", proxima_data: d,
      responsavel: responsavel.trim() || null,
    });
    setSalvando(false);
    if (error) return setErro(mensagemErro(error));
    nav.voltar();
  }
  return (
    <Tela titulo="Nova tarefa" voltar>
      <Campo rotulo="Tarefa" value={titulo} onChangeText={setTitulo} placeholder="Ex.: Limpar cascos, trocar água do cocho" />
      <Escolha rotulo="Animal (opcional)" permitirVazio valor={animal} aoEscolher={setAnimal}
        opcoes={(animais.dados ?? []).map((a: any) => ({ valor: a.id, rotulo: a.nome }))} />
            <Escolha rotulo="Repetir" valor={rec} aoEscolher={setRec} opcoes={RECORRENCIAS} colunas={2} />
      <Campo rotulo="Primeiro dia" value={data} onChangeText={(t) => setData(mascaraData(t))} keyboardType="number-pad" />
      <Campo rotulo="Responsável" value={responsavel} onChangeText={setResponsavel} />
      <Aviso texto={erro} tipo="erro" />
      <Botao titulo="Guardar" icone="check" onPress={salvar} carregando={salvando} />
    </Tela>
  );
}
