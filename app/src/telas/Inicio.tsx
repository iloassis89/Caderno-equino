import React from "react";
import { Text, View } from "react-native";
import { supabase } from "../supabase";
import { carregarPlano, ok, useCarga } from "../dados";
import { Botao, Cabecalho, Carregando, Cartao, ErroCarga, Icone, Rotulado, Selo, Tela, Vazio, useNav } from "../ui";
import { br, hojeISO, somarDias } from "../datas";
import { rotuloCategoria } from "../constantes";
import { cor, est } from "../tema";
import { Anuncio, AtalhoAssistente, DicaDoDia } from "../conteudo";

export default function Inicio() {
  const nav = useNav();
  const { dados, carregando, erro, recarregar } = useCarga(async () => {
    const hoje = hojeISO();
    const [plano, pendencias, tarefas, perfil, suporte] = await Promise.all([
      carregarPlano(),
      supabase.from("records").select("*, animals(nome)")
        .in("status", ["a_confirmar", "avaliacao_veterinaria"]).order("data", { ascending: false }).limit(20),
      supabase.from("tasks").select("id,titulo,proxima_data,animals(nome)").eq("ativo", true)
        .lte("proxima_data", somarDias(hoje, 3)).order("proxima_data").limit(10),
      supabase.from("profiles").select("nome").maybeSingle(),
      supabase.auth.getUser().then(({ data: u }) => supabase.from("suporte_conversas").select("id").eq("user_id", u.user?.id ?? "").eq("nao_lida_usuario", true).order("updated_at", { ascending: false }).limit(5)),
    ]);
    return { suporte: (suporte.data ?? []) as { id: string }[], plano, pendencias: ok(pendencias) ?? [], tarefas: ok(tarefas) ?? [], nome: (perfil.data?.nome as string | null) ?? null, hoje };
  });

  if (erro && !dados) return <Tela titulo="Início"><ErroCarga erro={erro} tentar={recarregar} /></Tela>;
  if (carregando && !dados) return <Tela titulo="Início"><Carregando /></Tela>;
  const d = dados!;
  const total = d.plano?.animais_ativos ?? 0;
  const vet = d.pendencias.filter((p: any) => p.status === "avaliacao_veterinaria");
  const confirmar = d.pendencias.filter((p: any) => p.status === "a_confirmar");
  const primeiroNome = d.nome?.split(" ")[0];

  return (
    <Tela titulo={primeiroNome ? `Olá, ${primeiroNome}` : "Olá"} subtitulo={`Plano ${d.plano?.nome ?? "Gratuito"} · ${total} de ${d.plano?.max_animais ?? 1} animal(is)`}>
      {d.suporte.length > 0 && (
        <Cartao style={{ backgroundColor: cor.couroClaro }} onPress={() => d.suporte.length === 1 ? nav.ir("SuporteConversa", { id: d.suporte[0].id }) : nav.ir("Suporte")}>
          <View style={[est.linha, { gap: 12 }]}>
            <Icone nome="message-reply-text-outline" tamanho={30} cor={cor.couro} />
            <Text style={[est.texto, { flex: 1, fontWeight: "700" }]}>Chegou resposta do suporte. Toque para ler.</Text>
          </View>
        </Cartao>
      )}
      {total === 0 ? (
        <Cartao style={{ backgroundColor: cor.mataClara }}>
          <Text style={[est.texto, { fontWeight: "700" }]}>Comece cadastrando seu animal.</Text>
          <Botao titulo="Cadastrar animal" icone="plus-circle" onPress={() => nav.ir("NovoAnimal")} />
        </Cartao>
      ) : (
        <Botao titulo="Anotar agora" icone="notebook-edit-outline" onPress={() => nav.aba("Anotar")} style={{ minHeight: 72 }} />
      )}

      {vet.length > 0 && (
        <>
          <Cabecalho texto={`Chamar veterinário (${vet.length})`} />
          {vet.map((p: any) => <ItemPendencia key={p.id} p={p} />)}
        </>
      )}

      <Cabecalho texto="Tarefas de hoje e dos próximos dias" />
      {d.tarefas.length === 0 ? <Vazio texto="Nenhuma tarefa marcada." /> : d.tarefas.map((t: any) => (
        <Cartao key={t.id} onPress={() => nav.ir("Tarefas")}>
          <View style={[est.linha, { gap: 10 }]}>
            <Icone nome="calendar-check" cor={t.proxima_data < d.hoje ? cor.barro : cor.mata} tamanho={28} />
            <View style={{ flex: 1 }}>
              <Text style={[est.texto, { fontWeight: "700" }]}>{t.titulo}</Text>
              <Text style={{ color: t.proxima_data < d.hoje ? cor.barro : cor.tintaSuave, fontSize: 16 }}>
                {t.proxima_data < d.hoje ? "Atrasada · " : ""}{br(t.proxima_data)}{t.animals?.nome ? ` · ${t.animals.nome}` : ""}
              </Text>
            </View>
          </View>
        </Cartao>
      ))}

      {confirmar.length > 0 && (
        <>
          <Cabecalho texto={`Para confirmar (${confirmar.length})`} />
          {confirmar.map((p: any) => <ItemPendencia key={p.id} p={p} />)}
        </>
      )}

      <View style={{ height: 14 }} />
      <DicaDoDia />

      <Cabecalho texto="Atalhos" />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Atalho icone="package-variant-closed" texto="Estoque" onPress={() => nav.ir("Estoque")} />
        <Atalho icone="calendar-check" texto="Tarefas" onPress={() => nav.ir("Tarefas")} />
        <Atalho icone="file-chart-outline" texto="Resumo da semana" onPress={() => nav.ir("Resumo")} />
      </View>
      <View style={{ height: 12 }} />
      <AtalhoAssistente />
      <Anuncio />
    </Tela>
  );
}

function Atalho({ icone, texto, onPress }: { icone: string; texto: string; onPress: () => void }) {
  return (
    <Cartao onPress={onPress} style={{ flex: 1, alignItems: "center", paddingVertical: 14, marginBottom: 0 }}>
      <Icone nome={icone} tamanho={34} cor={cor.mata} />
      <Text style={[est.textoSuave, { textAlign: "center", marginTop: 4, fontWeight: "700", color: cor.tinta }]}>{texto}</Text>
    </Cartao>
  );
}

function ItemPendencia({ p }: { p: any }) {
  const nav = useNav();
  return (
    <Cartao onPress={() => nav.ir("NovoRegistro", { registro: p })}>
      <Text style={[est.texto, { fontWeight: "700" }]}>{p.animals?.nome} · {rotuloCategoria(p.categoria)}</Text>
      <Text style={est.textoSuave}>{br(p.data)}</Text>
      <View style={{ marginVertical: 6 }}><Selo status={p.status} /></View>
      <Text style={est.texto}>{p.descricao}</Text>
      <Rotulado rotulo="O que decidir" valor={p.decisao_necessaria} />
      <Rotulado rotulo="Próximo passo" valor={p.proximo_passo} />
      <Text style={[est.textoSuave, { marginTop: 6, color: cor.couro, fontWeight: "700" }]}>Toque para atualizar a situação</Text>
    </Cartao>
  );
}
