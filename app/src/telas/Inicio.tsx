import React from "react";
import { Text, View } from "react-native";
import { supabase } from "../supabase";
import { carregarPlano, ok, useCarga } from "../dados";
import { Botao, Cabecalho, Carregando, Cartao, ErroCarga, Icone, Rotulado, Selo, Tela, Vazio, useNav } from "../ui";
import { br, hojeISO, quando, somarDias } from "../datas";
import { ParaFazerHoje } from "./Agenda";
import { rotuloCategoria } from "../constantes";
import { cor, est } from "../tema";
import { Anuncio, DicaDoDia } from "../conteudo";

export default function Inicio() {
  const nav = useNav();
  const { dados, carregando, erro, recarregar } = useCarga(async () => {
    const hoje = hojeISO();
    const [plano, pendencias, tarefas, perfil, suporte, assin] = await Promise.all([
      carregarPlano(),
      supabase.from("records").select("*, animals(nome)")
        .in("status", ["a_confirmar", "avaliacao_veterinaria"]).order("data", { ascending: false }).limit(20),
      supabase.from("tasks").select("id,titulo,proxima_data,animals(nome)").eq("ativo", true)
        .gt("proxima_data", hoje).lte("proxima_data", somarDias(hoje, 7)).order("proxima_data").limit(10),
      supabase.from("profiles").select("nome").maybeSingle(),
      supabase.auth.getUser().then(({ data: u }) => supabase.from("suporte_conversas").select("id").eq("user_id", u.user?.id ?? "").eq("nao_lida_usuario", true).order("updated_at", { ascending: false }).limit(5)),
      supabase.from("subscriptions").select("periodo_fim").eq("status", "ativa").like("id_externo", "infinitepay:%").order("periodo_fim", { ascending: false }).limit(1),
    ]);
    const fim = (assin.data?.[0]?.periodo_fim as string | undefined) ?? null;
    const diasPlano = fim ? Math.ceil((new Date(fim).getTime() - Date.now()) / 86400000) : null;
    return { diasPlano, suporte: (suporte.data ?? []) as { id: string }[], plano, pendencias: ok(pendencias) ?? [], tarefas: ok(tarefas) ?? [], nome: (perfil.data?.nome as string | null) ?? null, hoje };
  });

  if (erro && !dados) return <Tela titulo="Início"><ErroCarga erro={erro} tentar={recarregar} /></Tela>;
  if (carregando && !dados) return <Tela titulo="Início"><Carregando /></Tela>;
  const d = dados!;
  const total = d.plano?.animais_ativos ?? 0;
  const vet = d.pendencias.filter((p: any) => p.status === "avaliacao_veterinaria");
  const confirmar = d.pendencias.filter((p: any) => p.status === "a_confirmar");
  const primeiroNome = d.nome?.split(" ")[0];

  return (
    <Tela titulo={primeiroNome ? `Olá, ${primeiroNome}` : "Olá"}>
      {d.diasPlano != null && d.diasPlano <= 7 && (
        <Cartao style={{ backgroundColor: d.diasPlano <= 0 ? cor.barroClaro : cor.ouroClaro }} onPress={() => nav.ir("Planos")}>
          <View style={[est.linha, { gap: 12 }]}>
            <Icone nome="calendar-alert" tamanho={30} cor={d.diasPlano <= 0 ? cor.barro : cor.ouro} />
            <Text style={[est.texto, { flex: 1, fontWeight: "700" }]}>
              {d.diasPlano <= 0 ? "Seu plano venceu. Renove em até 5 dias para não perder as funções." : `Seu plano vence em ${d.diasPlano} dia(s). Toque para renovar pelo Pix.`}
            </Text>
          </View>
        </Cartao>
      )}
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
        <Botao titulo="Anotar" icone="notebook-edit-outline" onPress={() => nav.aba("Anotar")} style={{ minHeight: 72 }} />
      )}

      {vet.length > 0 && (
        <>
          <Cabecalho texto={`Chamar veterinário (${vet.length})`} />
          {vet.map((p: any) => <ItemPendencia key={p.id} p={p} />)}
        </>
      )}

      {total > 0 && <ParaFazerHoje aoMudar={recarregar} />}

      {d.tarefas.length > 0 && (
        <>
          <Cabecalho texto="Próximos dias" />
          {d.tarefas.map((t: any) => (
            <Cartao key={t.id} onPress={() => nav.aba("Agenda")}>
              <View style={[est.linha, { gap: 10 }]}>
                <Icone nome="calendar-check" cor={cor.mata} tamanho={26} />
                <Text style={[est.texto, { flex: 1 }]} numberOfLines={2}>{t.titulo}</Text>
                <Text style={[est.textoSuave, { fontWeight: "700" }]}>{quando(t.proxima_data)}</Text>
              </View>
            </Cartao>
          ))}
        </>
      )}

      {confirmar.length > 0 && (
        <>
          <Cabecalho texto={`Para confirmar (${confirmar.length})`} />
          {confirmar.map((p: any) => <ItemPendencia key={p.id} p={p} />)}
        </>
      )}

      <View style={{ height: 14 }} />
      <DicaDoDia />

      <Anuncio />
    </Tela>
  );
}

function ItemPendencia({ p }: { p: any }) {
  const nav = useNav();
  return (
    <Cartao onPress={() => nav.ir("NovoRegistro", { registro: p })}>
      <View style={[est.entre, { gap: 8 }]}>
        <Text style={[est.texto, { fontWeight: "700", flex: 1 }]}>{p.animals?.nome} · {rotuloCategoria(p.categoria)}</Text>
        <Icone nome="chevron-right" cor={cor.tintaSuave} />
      </View>
      <Text style={est.textoSuave}>{quando(p.data)}</Text>
      <Text style={est.texto} numberOfLines={3}>{p.descricao}</Text>

    </Cartao>
  );
}
