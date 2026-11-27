import React from "react";
import { Text, View } from "react-native";
import { supabase } from "../supabase";
import { carregarPlano, useCarga } from "../dados";
import { Botao, Cabecalho, Carregando, Cartao, Rotulado, Selo, Tela, Vazio, useNav } from "../ui";
import { br, hojeISO, somarDias } from "../datas";
import { rotuloCategoria } from "../constantes";
import { cor, est } from "../tema";

export default function Inicio() {
  const nav = useNav();
  const { dados, carregando, recarregar } = useCarga(async () => {
    const hoje = hojeISO();
    const [plano, pendencias, tarefas] = await Promise.all([
      carregarPlano(),
      supabase.from("records").select("id,data,categoria,descricao,status,decisao_necessaria,proximo_passo,animals(nome)")
        .in("status", ["a_confirmar", "avaliacao_veterinaria", "planejado"]).order("data", { ascending: false }).limit(20),
      supabase.from("tasks").select("id,titulo,proxima_data,animals(nome)").eq("ativo", true)
        .lte("proxima_data", somarDias(hoje, 7)).order("proxima_data").limit(20),
    ]);
    return { plano, pendencias: pendencias.data ?? [], tarefas: tarefas.data ?? [], totalAnimais: plano?.animais_ativos ?? 0, hoje };
  });

  if (carregando && !dados) return <Tela titulo="Início"><Carregando /></Tela>;
  const d = dados!;
  const vet = d.pendencias.filter((p: any) => p.status === "avaliacao_veterinaria");
  const confirmar = d.pendencias.filter((p: any) => p.status === "a_confirmar");
  const planejados = d.pendencias.filter((p: any) => p.status === "planejado");

  return (
    <Tela titulo="Início" subtitulo={`Plano ${d.plano?.nome ?? "Gratuito"} · ${d.totalAnimais} de ${d.plano?.max_animais ?? 1} animal(is)`}
      acao={<Botao titulo="Atualizar" tipo="leve" onPress={recarregar} style={{ marginTop: 0, paddingVertical: 6 }} />}>
      {d.totalAnimais === 0 && (
        <Cartao style={{ backgroundColor: cor.mataClara }}>
          <Text style={est.texto}>Comece cadastrando seu primeiro animal.</Text>
          <Botao titulo="Cadastrar animal" onPress={() => nav.ir("NovoAnimal")} />
        </Cartao>
      )}

      <Botao titulo="+ Novo registro" onPress={() => nav.ir("NovoRegistro")} />

      <Cabecalho texto={`Avaliação veterinária (${vet.length})`} />
      {vet.length === 0 ? <Vazio texto="Nenhum sinal aguardando avaliação." /> : vet.map((p: any) => <ItemPendencia key={p.id} p={p} />)}

      <Cabecalho texto={`A confirmar (${confirmar.length})`} />
      {confirmar.length === 0 ? <Vazio texto="Nada aguardando confirmação." /> : confirmar.map((p: any) => <ItemPendencia key={p.id} p={p} />)}

      <Cabecalho texto="Tarefas dos próximos 7 dias" />
      {d.tarefas.length === 0 ? <Vazio texto="Nenhuma tarefa prevista." /> : d.tarefas.map((t: any) => (
        <Cartao key={t.id} onPress={() => nav.ir("Tarefas")}>
          <View style={est.entre}>
            <Text style={[est.texto, { flex: 1 }]}>{t.titulo}</Text>
            <Text style={{ color: t.proxima_data < d.hoje ? cor.barro : cor.tintaSuave, fontWeight: "600" }}>
              {t.proxima_data < d.hoje ? "Atrasada · " : ""}{br(t.proxima_data)}
            </Text>
          </View>
          {t.animals?.nome ? <Text style={est.textoSuave}>{t.animals.nome}</Text> : null}
        </Cartao>
      ))}

      <Cabecalho texto={`Planejados (${planejados.length})`} />
      {planejados.length === 0 ? <Vazio texto="Nenhum cuidado planejado." /> : planejados.slice(0, 8).map((p: any) => <ItemPendencia key={p.id} p={p} />)}
    </Tela>
  );
}

function ItemPendencia({ p }: { p: any }) {
  return (
    <Cartao>
      <View style={est.entre}>
        <Text style={[est.texto, { fontWeight: "700", flex: 1 }]}>{p.animals?.nome} · {rotuloCategoria(p.categoria)}</Text>
        <Selo status={p.status} />
      </View>
      <Text style={est.textoSuave}>{br(p.data)}</Text>
      <Text style={[est.texto, { marginTop: 4 }]}>{p.descricao}</Text>
      <Rotulado rotulo="Decisão necessária" valor={p.decisao_necessaria} />
      <Rotulado rotulo="Próximo passo" valor={p.proximo_passo} />
    </Cartao>
  );
}
