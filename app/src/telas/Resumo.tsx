import React, { useState } from "react";
import { Platform, Share, Text, View } from "react-native";
import { supabase } from "../supabase";
import { useCarga } from "../dados";
import { Bloqueado, Botao, Cabecalho, Carregando, Cartao, Tela, Vazio, usePlano } from "../ui";
import { MOVIMENTOS, STATUS, reais, rotuloCategoria, rotuloDe } from "../constantes";
import { br, hojeISO, semanaDe, somarDias } from "../datas";
import { est } from "../tema";

export default function Resumo() {
  const { pago } = usePlano();
  const [ref, setRef] = useState(hojeISO());
  const { inicio, fim } = semanaDe(ref);
  const { dados, carregando } = useCarga(async () => {
    const [r, ex, mv] = await Promise.all([
      supabase.from("records").select("*, animals(nome)").gte("data", inicio).lte("data", fim).order("data"),
      supabase.from("task_runs").select("*, tasks(titulo)").gte("data", inicio).lte("data", fim).order("data"),
      supabase.from("stock_movements").select("*, stock_items(nome,unidade)").gte("data", inicio).lte("data", fim).order("data"),
    ]);
    return { registros: r.data ?? [], execucoes: ex.data ?? [], movs: mv.data ?? [] };
  }, [inicio]);

  function textoResumo() {
    if (!dados) return "";
    const l: string[] = [`IAS HORSE — Resumo da semana ${br(inicio)} a ${br(fim)}`, ""];
    for (const s of STATUS) {
      const itens = dados.registros.filter((r: any) => r.status === s.valor);
      l.push(`${s.rotulo.toUpperCase()} (${itens.length})`);
      itens.forEach((r: any) => l.push(`- ${br(r.data)} ${r.animals?.nome} · ${rotuloCategoria(r.categoria)}: ${r.descricao}${r.proximo_passo ? ` → Próximo passo: ${r.proximo_passo}` : ""}`));
      l.push("");
    }
    l.push(`TAREFAS FEITAS (${dados.execucoes.length})`);
    dados.execucoes.forEach((e: any) => l.push(`- ${br(e.data)} ${e.tasks?.titulo}`));
    l.push("", "ESTOQUE");
    dados.movs.forEach((m: any) => l.push(`- ${br(m.data)} ${m.stock_items?.nome}: ${rotuloDe(MOVIMENTOS, m.tipo)} ${Number(m.quantidade).toLocaleString("pt-BR")} ${m.stock_items?.unidade}${m.custo_total_centavos != null ? ` (${reais(m.custo_total_centavos)})` : ""}`));
    return l.join("\n");
  }

  async function compartilhar() {
    const t = textoResumo();
    if (Platform.OS === "web") {
      // @ts-ignore
      if (navigator.share) { await navigator.share({ text: t }).catch(() => {}); return; }
      // @ts-ignore
      const w = window.open("", "_blank");
      if (!w) return;
      const esc = (x: string) => x.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
      w.document.write(`<pre style="font-family:Georgia,serif;font-size:14px;white-space:pre-wrap;margin:24px">${esc(t)}</pre>`);
      w.document.close();
      setTimeout(() => { try { w.focus(); w.print(); } catch {} }, 400);
    } else {
      await Share.share({ message: t });
    }
  }

  const gasto = (dados?.movs ?? []).filter((m: any) => m.tipo === "compra_realizada").reduce((s: number, m: any) => s + Number(m.custo_total_centavos ?? 0), 0);

  if (!pago) {
    return (
      <Tela titulo="Resumo da semana" voltar>
        <Bloqueado titulo="Resumo da semana" texto="Veja tudo o que foi feito, o que falta e quanto foi gasto na semana, pronto para imprimir ou mandar. Disponível a partir de R$ 9,90 por mês." />
      </Tela>
    );
  }

  return (
    <Tela titulo="Resumo da semana" voltar subtitulo={`${br(inicio)} a ${br(fim)}`}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Botao titulo="‹ Anterior" tipo="leve" style={{ flex: 1 }} onPress={() => setRef(somarDias(inicio, -7))} />
        <Botao titulo="Próxima ›" tipo="leve" style={{ flex: 1 }} onPress={() => setRef(somarDias(inicio, 7))} />
      </View>
      {carregando && !dados ? <Carregando /> : (
        <>
          <Cartao style={{ marginTop: 12 }}>
            {STATUS.map((s) => (
              <Text key={s.valor} style={est.texto}>{s.rotulo}: <Text style={{ fontWeight: "700" }}>{dados!.registros.filter((r: any) => r.status === s.valor).length}</Text></Text>
            ))}
            <Text style={est.texto}>Tarefas feitas: <Text style={{ fontWeight: "700" }}>{dados!.execucoes.length}</Text></Text>
            <Text style={est.texto}>Compras feitas: <Text style={{ fontWeight: "700" }}>{reais(gasto)}</Text></Text>
          </Cartao>
          {STATUS.map((s) => {
            const itens = dados!.registros.filter((r: any) => r.status === s.valor);
            return (
              <View key={s.valor}>
                <Cabecalho texto={`${s.rotulo} (${itens.length})`} />
                {itens.length === 0 ? <Vazio texto="Nenhum." /> : itens.map((r: any) => (
                  <Text key={r.id} style={[est.texto, { marginBottom: 6 }]}>
                    <Text style={{ fontWeight: "700" }}>{br(r.data)} · {r.animals?.nome} · {rotuloCategoria(r.categoria)}: </Text>{r.descricao}
                    {r.proximo_passo ? <Text style={est.textoSuave}> → {r.proximo_passo}</Text> : null}
                  </Text>
                ))}
              </View>
            );
          })}
          <Botao titulo={Platform.OS === "web" ? "Compartilhar ou imprimir" : "Compartilhar resumo"} tipo="secundario" onPress={compartilhar} />
        </>
      )}
    </Tela>
  );
}
