// Agenda: despertadores do dia a dia (comida, água, remédio), tarefas com data e "comprar de novo".
// Tudo em toques; escrever é opcional.
import React, { useEffect, useState } from "react";
import { Linking, Platform, Pressable, Text, View } from "react-native";
import { mensagemErro, supabase, URL_APP_WEB } from "../supabase";
import { carregarAnimais, ok, useCarga } from "../dados";
import {
  Aviso, Botao, BotaoConfirmar, Cabecalho, Campo, Carregando, Cartao, ErroCarga, Escolha, EscolhaVarias, Horarios, Icone, Tela, Vazio, useNav, usePlano,
} from "../ui";
import { QUEM_FEZ, RECORRENCIAS, rotuloDe, numBR } from "../constantes";
import { br, hojeISO, mascaraData, paraISO, proximaData, somarDias } from "../datas";
import {
  DIAS, HORARIOS_PRONTOS, TIPOS_LEMBRETE, horariosDeHoje, iconeLembrete, pedirPermissao, sincronizarLembretes, temDespertador, type Lembrete,
} from "../lembretes";
import { cor, est, tam } from "../tema";

// ---------- Ações compartilhadas ----------
export async function concluirTarefa(t: any): Promise<{ erro?: string; prox?: string | null }> {
  const hoje = hojeISO();
  const { error } = await supabase.from("task_runs").insert({ task_id: t.id, data: hoje, responsavel: t.responsavel });
  if (error) return { erro: mensagemErro(error) };
  const prox = proximaData(hoje, t.recorrencia, t.intervalo ?? 1);
  const up = await supabase.from("tasks").update(prox ? { proxima_data: prox } : { ativo: false }).eq("id", t.id);
  if (up.error) return { erro: mensagemErro(up.error) };
  sincronizarLembretes().catch(() => {});
  return { prox };
}

export async function marcarLembrete(id: string, horario: string) {
  const { data, error } = await supabase.rpc("marcar_lembrete_feito", { p_lembrete: id, p_horario: horario });
  if (error) return { erro: mensagemErro(error) };
  const r = (data as any[])?.[0];
  if (r?.proxima) sincronizarLembretes().catch(() => {});
  return { ja: !!r?.ja_feito };
}

// ---------- Lista "Para fazer hoje" (usada no Início) ----------
export function ParaFazerHoje({ aoMudar }: { aoMudar?: () => void }) {
  const nav = useNav();
  const hoje = hojeISO();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const dados = useCarga(async () => {
    const [l, f, t, p] = await Promise.all([
      supabase.from("lembretes").select("*, animals(nome)").eq("ativo", true),
      supabase.from("lembrete_feitos").select("lembrete_id,horario").eq("dia", hoje),
      supabase.from("tasks").select("*, animals(nome)").eq("ativo", true).lte("proxima_data", hoje).order("proxima_data").limit(20),
      supabase.from("records").select("*, animals(nome)").eq("status", "planejado").lte("data", somarDias(hoje, 3)).order("data").limit(10),
    ]);
    const feitos = new Set((f.data ?? []).map((x: any) => `${x.lembrete_id}|${x.horario}`));
    const itens = ((l.data ?? []) as Lembrete[]).flatMap((lb) => horariosDeHoje(lb, hoje).map((h) => ({ lb, h, feito: feitos.has(`${lb.id}|${h}`) })))
      .sort((a, b) => a.h.localeCompare(b.h));
    return { itens, tarefas: t.data ?? [], planejados: p.data ?? [] };
  });

  async function tocarLembrete(id: string, h: string) {
    if (ocupado) return;
    setOcupado(`${id}|${h}`); setMsg(null);
    const r = await marcarLembrete(id, h);
    setOcupado(null);
    if (r.erro) return setMsg(r.erro);
    dados.recarregar(); aoMudar?.();
  }
  async function tocarTarefa(t: any) {
    if (ocupado) return;
    setOcupado(t.id); setMsg(null);
    const r = await concluirTarefa(t);
    setOcupado(null);
    if (r.erro) return setMsg(r.erro);
    setMsg(`"${t.titulo}" feita.${r.prox ? ` Próxima: ${br(r.prox)}.` : ""}`);
    dados.recarregar(); aoMudar?.();
  }

  if (dados.carregando && !dados.dados) return <Carregando />;
  if (dados.erro && !dados.dados) return <ErroCarga erro={dados.erro} tentar={dados.recarregar} />;
  const d = dados.dados!;
  const nada = d.itens.length === 0 && d.tarefas.length === 0 && d.planejados.length === 0;
  return (
    <View>
      <Cabecalho texto="Para fazer hoje" />
      <Aviso texto={msg} tipo={msg?.includes("feita") ? "ok" : "erro"} />
      {nada ? (
        <Cartao>
          <Text style={est.texto}>Nada marcado para hoje.</Text>
          <Botao titulo="Criar lembrete" tipo="leve" icone="bell-plus-outline" onPress={() => nav.ir("NovoLembrete")} />
        </Cartao>
      ) : null}
      {d.itens.map(({ lb, h, feito }) => (
        <LinhaCaixa key={`${lb.id}|${h}`} marcado={feito} ocupado={ocupado === `${lb.id}|${h}`} icone={iconeLembrete(lb.tipo)}
          titulo={`${h} · ${lb.titulo}`} sub={lb.animals?.nome ?? undefined} onPress={() => !feito && tocarLembrete(lb.id, h)} />
      ))}
      {d.tarefas.map((t: any) => (
        <LinhaCaixa key={t.id} marcado={false} ocupado={ocupado === t.id} icone="calendar-check" titulo={t.titulo}
          sub={[t.proxima_data < hoje ? `Atrasada (${br(t.proxima_data)})` : "Hoje", t.animals?.nome].filter(Boolean).join(" · ")}
          alerta={t.proxima_data < hoje} onPress={() => tocarTarefa(t)} />
      ))}
      {d.planejados.map((r: any) => (
        <LinhaCaixa key={r.id} marcado={false} icone="clock-outline" titulo={r.descricao} sub={`${br(r.data)} · ${r.animals?.nome ?? ""} · toque para marcar como feito`}
          onPress={() => nav.ir("NovoRegistro", { registro: { ...r, status: "realizado", data: r.data > hoje ? hoje : r.data } })} />
      ))}
    </View>
  );
}

function LinhaCaixa({ marcado, ocupado, icone, titulo, sub, onPress, alerta }: {
  marcado: boolean; ocupado?: boolean; icone: string; titulo: string; sub?: string; onPress: () => void; alerta?: boolean;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: marcado }} disabled={ocupado}
      style={[est.cartao, { flexDirection: "row", alignItems: "center", gap: 12, opacity: marcado ? 0.6 : ocupado ? 0.5 : 1, paddingVertical: 14 }]}>
      <Icone nome={marcado ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} tamanho={34} cor={marcado ? cor.mata : alerta ? cor.barro : cor.borda} />
      <View style={{ flex: 1 }}>
        <Text style={[est.texto, { fontWeight: "700", textDecorationLine: marcado ? "line-through" : "none" }]} numberOfLines={2}>{titulo}</Text>
        {sub ? <Text style={[est.textoSuave, alerta ? { color: cor.barro, fontWeight: "700" } : null]}>{sub}</Text> : null}
      </View>
      <Icone nome={icone} tamanho={26} cor={cor.mata} />
    </Pressable>
  );
}

// ---------- Aviso de permissão / site ----------
function AvisoDespertador() {
  const [permitido, setPermitido] = useState<boolean | null>(null);
  useEffect(() => {
    if (!temDespertador) return;
    sincronizarLembretes().then((r) => setPermitido(r.permitido)).catch(() => setPermitido(false));
  }, []);
  if (!temDespertador) {
    return (
      <Cartao style={{ backgroundColor: cor.ouroClaro }}>
        <Text style={est.texto}>No site o despertador não toca. Instale o app no Android para receber os avisos no celular.</Text>
        <Botao titulo="Baixar o app Android" tipo="leve" icone="android" onPress={() => Linking.openURL(`${URL_APP_WEB}android`)} />
      </Cartao>
    );
  }
  if (permitido !== false) return null;
  return (
    <Cartao style={{ backgroundColor: cor.ouroClaro }}>
      <Text style={est.texto}>Para o celular tocar na hora, permita os avisos do IAS Horse.</Text>
      <Botao titulo="Permitir avisos" icone="bell-ring-outline" onPress={async () => {
        const okp = await pedirPermissao();
        setPermitido(okp);
        if (okp) sincronizarLembretes().catch(() => {});
        else Linking.openSettings().catch(() => {});
      }} />
    </Cartao>
  );
}

// ---------- Agenda (aba) ----------
export function Agenda() {
  const nav = useNav();
  const { pago } = usePlano();
  const hoje = hojeISO();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const dados = useCarga(async () => {
    const [l, t, p] = await Promise.all([
      supabase.from("lembretes").select("*, animals(nome)").eq("ativo", true).order("created_at"),
      supabase.from("tasks").select("*, animals(nome)").eq("ativo", true).order("proxima_data", { nullsFirst: false }),
      pago ? supabase.rpc("previsao_estoque") : Promise.resolve({ data: [] as any[], error: null }),
    ]);
    return { lembretes: (ok(l) ?? []) as Lembrete[], tarefas: ok(t) ?? [], previsao: (p.data ?? []) as any[] };
  }, [pago]);

  async function feita(t: any) {
    if (ocupado) return;
    setOcupado(t.id); setMsg(null);
    const r = await concluirTarefa(t);
    setOcupado(null);
    setMsg(r.erro ?? `"${t.titulo}" feita.${r.prox ? ` Próxima: ${br(r.prox)}.` : ""}`);
    dados.recarregar();
  }

  if (dados.erro && !dados.dados) return <Tela titulo="Agenda"><ErroCarga erro={dados.erro} tentar={dados.recarregar} /></Tela>;
  if (dados.carregando && !dados.dados) return <Tela titulo="Agenda"><Carregando /></Tela>;
  const d = dados.dados!;
  const diarios = d.lembretes.filter((l) => !["tarefa", "reposicao"].includes(l.tipo));
  const comAviso = new Set(d.lembretes.filter((l) => l.tipo === "tarefa").map((l) => l.task_id));
  const reposicao = new Map(d.lembretes.filter((l) => l.tipo === "reposicao").map((l) => [l.stock_item_id, l]));

  return (
    <Tela titulo="Agenda">
      <AvisoDespertador />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Botao titulo="Lembrete" icone="bell-plus-outline" style={{ flex: 1 }} onPress={() => nav.ir("NovoLembrete")} />
        <Botao titulo="Tarefa" icone="calendar-plus" tipo="leve" style={{ flex: 1 }} onPress={() => nav.ir("NovaTarefa")} />
      </View>
      <Aviso texto={msg} tipo={msg?.includes("feita") ? "ok" : "erro"} />

      <Cabecalho texto="Todo dia" />
      {diarios.length === 0 ? <Vazio texto="Nenhum despertador. Ex.: hora da ração, da água ou do remédio da receita." /> : diarios.map((l) => (
        <Cartao key={l.id} onPress={() => nav.ir("NovoLembrete", { lembrete: l })}>
          <View style={[est.linha, { gap: 12 }]}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: cor.mataClara, alignItems: "center", justifyContent: "center" }}>
              <Icone nome={iconeLembrete(l.tipo)} tamanho={26} cor={cor.mata} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[est.texto, { fontWeight: "700" }]}>{l.titulo}</Text>
              <Text style={est.textoSuave}>
                {[l.horarios.join(" · "), l.dias_semana?.length ? l.dias_semana.map((x) => DIAS[x]).join(", ") : "todo dia",
                  l.data_fim ? `até ${br(l.data_fim)}` : null, l.animals?.nome].filter(Boolean).join(" · ")}
              </Text>
            </View>
            <Icone nome="chevron-right" cor={cor.tintaSuave} />
          </View>
        </Cartao>
      ))}

      <Cabecalho texto="Tarefas com data" />
      {d.tarefas.length === 0 ? <Vazio texto="Nenhuma tarefa. Ex.: ferrador, dentista, exame de AIE." /> : d.tarefas.map((t: any) => {
        const atrasada = t.proxima_data && t.proxima_data < hoje;
        return (
          <Cartao key={t.id}>
            <View style={[est.linha, { gap: 10 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[est.texto, { fontWeight: "700" }]}>{t.titulo}</Text>
                <Text style={[est.textoSuave, atrasada ? { color: cor.barro, fontWeight: "700" } : null]}>
                  {[atrasada ? `Atrasada · ${br(t.proxima_data)}` : t.proxima_data === hoje ? "Hoje" : br(t.proxima_data),
                    rotuloDe(RECORRENCIAS, t.recorrencia), t.animals?.nome].filter(Boolean).join(" · ")}
                </Text>
              </View>
              {comAviso.has(t.id) && <Icone nome="bell-ring-outline" tamanho={24} cor={cor.mata} />}
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Botao titulo="Feito" icone="check" style={{ flex: 2 }} onPress={() => feita(t)} carregando={ocupado === t.id} />
              <Botao titulo="Mudar" tipo="leve" style={{ flex: 1 }} onPress={() => nav.ir("NovaTarefa", { tarefa: t })} />
            </View>
          </Cartao>
        );
      })}

      {pago && d.previsao.length > 0 && (
        <>
          <Cabecalho texto="Comprar de novo" />
          {d.previsao.map((p: any) => {
            const lb = reposicao.get(p.item_id);
            return (
              <Cartao key={p.item_id}>
                <Text style={[est.texto, { fontWeight: "700" }]}>{p.nome}</Text>
                <Text style={[est.textoSuave, p.dias_restantes != null && p.dias_restantes <= 5 ? { color: cor.barro, fontWeight: "700" } : null]}>
                  {p.dias_restantes == null ? "Sem consumo anotado para prever." : p.dias_restantes <= 0 ? "Deve ter acabado." : `Dá para cerca de ${p.dias_restantes} dia(s) (até ${br(p.acaba_em)}).`}
                  {p.consumo_dia ? ` Usa ~${numBR(Number(p.consumo_dia))} ${p.unidade ?? ""}/dia.` : ""}
                </Text>
                {p.dias_restantes != null && (
                  <AvisoReposicao itemId={p.item_id} nome={p.nome} lembrete={lb} aoMudar={dados.recarregar} />
                )}
              </Cartao>
            );
          })}
        </>
      )}
    </Tela>
  );
}

function AvisoReposicao({ itemId, nome, lembrete, aoMudar }: { itemId: string; nome: string; lembrete?: Lembrete; aoMudar: () => void }) {
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  async function escolher(v: string | null) {
    if (ocupado) return;
    setOcupado(true); setErro(null);
    let r: any;
    if (v === "0" && lembrete) r = await supabase.from("lembretes").delete().eq("id", lembrete.id);
    else if (v && v !== "0") {
      if (lembrete) r = await supabase.from("lembretes").update({ antecedencia_dias: Number(v) }).eq("id", lembrete.id);
      else {
        await pedirPermissao();
        r = await supabase.from("lembretes").insert({ tipo: "reposicao", titulo: `Comprar ${nome}`, stock_item_id: itemId, horarios: ["08:00"], antecedencia_dias: Number(v) });
      }
    }
    setOcupado(false);
    if (r?.error) return setErro(mensagemErro(r.error));
    sincronizarLembretes().catch(() => {});
    aoMudar();
  }
  return (
    <View style={{ marginTop: 8 }}>
      <Escolha rotulo="Avisar antes de acabar" valor={lembrete ? String(lembrete.antecedencia_dias) : "0"} aoEscolher={escolher}
        opcoes={[{ valor: "0", rotulo: "Não" }, { valor: "3", rotulo: "3 dias antes" }, { valor: "7", rotulo: "7 dias antes" }]} />
      <Aviso texto={erro} tipo="erro" />
    </View>
  );
}

// ---------- Novo / editar lembrete ----------
const TITULOS: Record<string, string[]> = {
  alimentacao: ["Dar ração", "Dar feno", "Soltar no pasto", "Dar sal mineral", "Dar suplemento"],
  agua: ["Trocar a água", "Lavar o cocho", "Conferir o bebedouro"],
  remedio: ["Dar o remédio da receita", "Fazer o curativo", "Aplicar a pomada"],
  outro: ["Limpar a baia", "Escovar", "Limpar os cascos", "Recolher do pasto"],
};
const DURACAO: { valor: string; rotulo: string }[] = [
  { valor: "1", rotulo: "Só hoje" }, { valor: "3", rotulo: "3 dias" }, { valor: "5", rotulo: "5 dias" }, { valor: "7", rotulo: "7 dias" },
  { valor: "10", rotulo: "10 dias" }, { valor: "14", rotulo: "14 dias" }, { valor: "30", rotulo: "30 dias" }, { valor: "sempre", rotulo: "Sem data para acabar" },
];

export function NovoLembrete({ lembrete }: { lembrete?: Lembrete }) {
  const nav = useNav();
  const animais = useCarga(() => carregarAnimais(true));
  const lista = animais.dados ?? [];
  const [tipo, setTipo] = useState<string | null>(lembrete?.tipo ?? null);
  const [animal, setAnimal] = useState<string | null>(lembrete?.animal_id ?? null);
  const pronto = !!lembrete && (TITULOS[lembrete.tipo] ?? []).includes(lembrete.titulo);
  const [titulo, setTitulo] = useState<string | null>(pronto ? lembrete!.titulo : null);
  const [outroTitulo, setOutroTitulo] = useState(lembrete && !pronto ? lembrete.titulo : "");
  const [horarios, setHorarios] = useState<string[]>(lembrete?.horarios ?? []);
  const [todoDia, setTodoDia] = useState<string | null>(lembrete?.dias_semana?.length ? "dias" : "todo");
  const [dias, setDias] = useState<string[]>((lembrete?.dias_semana ?? []).map(String));
  const [duracao, setDuracao] = useState<string | null>(lembrete ? (lembrete.data_fim ? null : "sempre") : null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { if (!animal && !lembrete && lista.length === 1) setAnimal(lista[0].id); }, [lista.length]);
  const sugestoes = tipo ? TITULOS[tipo] ?? [] : [];
  const tipos = TIPOS_LEMBRETE.filter((t) => !["tarefa", "reposicao"].includes(t.valor));

  async function salvar() {
    setErro(null);
    if (!tipo) return setErro("Escolha o tipo do lembrete.");
    const t = (outroTitulo.trim() || titulo || "").trim();
    if (!t) return setErro("Escolha ou escreva o que é para fazer.");
    if (!horarios.length) return setErro("Escolha pelo menos um horário.");
    if (todoDia === "dias" && !dias.length) return setErro("Escolha os dias da semana.");
    if (tipo === "remedio" && !duracao && !lembrete?.data_fim) return setErro("Por quantos dias? Use o que está na receita.");
    const inicio = lembrete?.data_inicio ?? hojeISO();
    const fim = duracao === "sempre" ? null : duracao ? somarDias(hojeISO(), Number(duracao) - 1) : lembrete?.data_fim ?? null;
    setSalvando(true);
    const linha = {
      tipo, titulo: t.slice(0, 120), animal_id: animal, horarios, dias_semana: todoDia === "dias" ? dias.map(Number).sort() : null,
      data_inicio: inicio, data_fim: fim,
    };
    const r = lembrete ? await supabase.from("lembretes").update(linha).eq("id", lembrete.id) : await supabase.from("lembretes").insert(linha);
    if (r.error) { setSalvando(false); return setErro(mensagemErro(r.error)); }
    await pedirPermissao();
    await sincronizarLembretes().catch(() => {});
    setSalvando(false);
    nav.voltar();
  }

  return (
    <Tela titulo={lembrete ? "Mudar lembrete" : "Novo lembrete"} voltar>
      <Escolha rotulo="Lembrar de quê?" valor={tipo} aoEscolher={(v) => { setTipo(v); setTitulo(null); }} opcoes={tipos} colunas={2} />
      {tipo === "remedio" && <Aviso texto="Use o horário e os dias que estão na receita do veterinário. O app só lembra; não indica remédio nem dose." />}
      {lista.length > 1 && (
        <Escolha rotulo="Qual animal?" permitirVazio valor={animal} aoEscolher={setAnimal}
          opcoes={[...lista.map((a: any) => ({ valor: a.id, rotulo: a.nome, icone: "horse-variant" }))]} />
      )}
      {tipo && (
        <>
          <Escolha rotulo="O que fazer" valor={titulo} aoEscolher={(v) => { setTitulo(v); setOutroTitulo(""); }} permitirVazio
            opcoes={sugestoes.map((s) => ({ valor: s, rotulo: s }))} colunas={2} />
          <Campo rotulo="Ou escreva (opcional)" value={outroTitulo} onChangeText={setOutroTitulo} placeholder={tipo === "remedio" ? "Ex.: nome do remédio da receita" : "Ex.: dar ração da tarde"} maxLength={120} />
          <Horarios rotulo="Que horas?" prontos={HORARIOS_PRONTOS} valores={horarios} aoMudar={setHorarios} />
          <Escolha rotulo="Quais dias?" valor={todoDia} aoEscolher={setTodoDia} opcoes={[{ valor: "todo", rotulo: "Todo dia" }, { valor: "dias", rotulo: "Escolher dias" }]} />
          {todoDia === "dias" && <EscolhaVarias valores={dias} aoMudar={setDias} opcoes={DIAS.map((n, i) => ({ valor: String(i), rotulo: n }))} />}
          <Escolha rotulo={tipo === "remedio" ? "Por quantos dias (da receita)?" : "Até quando?"} valor={duracao} aoEscolher={setDuracao}
            opcoes={tipo === "remedio" ? DURACAO : [{ valor: "sempre", rotulo: "Sem data para acabar" }, ...DURACAO.filter((x) => ["7", "30"].includes(x.valor))]} />
          {lembrete?.data_fim && !duracao && <Text style={[est.textoSuave, { marginTop: -6, marginBottom: 10 }]}>Hoje vai até {br(lembrete.data_fim)}.</Text>}
        </>
      )}
      <Aviso texto={erro} tipo="erro" />
      <Botao titulo="Guardar lembrete" icone="bell-check-outline" onPress={salvar} carregando={salvando} />
      {lembrete && (
        <View style={{ marginTop: 20 }}>
          <BotaoConfirmar titulo="Apagar lembrete" onConfirmar={async () => {
            const { error } = await supabase.from("lembretes").delete().eq("id", lembrete.id);
            if (error) return setErro(mensagemErro(error));
            sincronizarLembretes().catch(() => {});
            nav.voltar();
          }} />
        </View>
      )}
    </Tela>
  );
}

// ---------- Nova / mudar tarefa ----------
const TAREFAS_PRONTAS = ["Limpar cascos", "Ferrador", "Dentista", "Vermifugar (conforme vet)", "Vacinar (conforme vet)", "Exame AIE e Mormo",
  "Coleta de fezes (OPG)", "Limpar a baia", "Trocar a água do cocho", "Pesar com fita", "Comprar ração"];
const REPETE_TODO_DIA = ["Limpar cascos", "Limpar a baia", "Trocar a água do cocho"];

export function NovaTarefa({ tarefa }: { tarefa?: any }) {
  const nav = useNav();
  const animais = useCarga(() => carregarAnimais(true));
  const avisoAtual = useCarga(async () => tarefa ? ((await supabase.from("lembretes").select("*").eq("task_id", tarefa.id).maybeSingle()).data as Lembrete | null) : null, [tarefa?.id]);
  const lista = animais.dados ?? [];
  const [escolhida, setEscolhida] = useState<string | null>(tarefa && TAREFAS_PRONTAS.includes(tarefa.titulo) ? tarefa.titulo : null);
  const [titulo, setTitulo] = useState(tarefa && !TAREFAS_PRONTAS.includes(tarefa.titulo) ? tarefa.titulo : "");
  const [animal, setAnimal] = useState<string | null>(tarefa?.animal_id ?? null);
  const [rec, setRec] = useState<string | null>(tarefa?.recorrencia ?? null);
  const [quando, setQuando] = useState<string | null>(tarefa ? "outro" : "hoje");
  const [data, setData] = useState(tarefa ? br(tarefa.proxima_data) : br(hojeISO()));
  const [quem, setQuem] = useState<string | null>(tarefa?.responsavel && QUEM_FEZ.includes(tarefa.responsavel) ? tarefa.responsavel : null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [hora, setHora] = useState<string[]>(["07:00"]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { if (!animal && !tarefa && lista.length === 1) setAnimal(lista[0].id); }, [lista.length]);
  useEffect(() => {
    if (avisoAtual.dados !== undefined) {
      const l = avisoAtual.dados;
      setAviso(l ? String(l.antecedencia_dias) : temDespertador ? "0" : "nao");
      if (l?.horarios?.length) setHora([l.horarios[0]]);
    }
  }, [avisoAtual.dados]);

  async function salvar() {
    setErro(null);
    const t = (titulo.trim() || escolhida || "").trim();
    if (!t) return setErro("Escolha ou escreva a tarefa.");
    const d = quando === "hoje" ? hojeISO() : quando === "amanha" ? somarDias(hojeISO(), 1) : quando === "7" ? somarDias(hojeISO(), 7) : paraISO(data);
    if (!d) return setErro("Data inválida. Use dia/mês/ano.");
    setSalvando(true);
    const linha = { titulo: t.slice(0, 120), animal_id: animal, recorrencia: rec ?? "unica", proxima_data: d, responsavel: quem };
    const r = tarefa ? await supabase.from("tasks").update(linha).eq("id", tarefa.id).select("id").single()
      : await supabase.from("tasks").insert(linha).select("id").single();
    if (r.error) { setSalvando(false); return setErro(mensagemErro(r.error)); }
    const atual = avisoAtual.dados;
    if (aviso && aviso !== "nao") {
      const l = { tipo: "tarefa", titulo: t.slice(0, 120), animal_id: animal, task_id: r.data.id, horarios: [hora[0] ?? "07:00"], antecedencia_dias: Number(aviso) };
      const w = atual ? await supabase.from("lembretes").update(l).eq("id", atual.id) : await supabase.from("lembretes").insert(l);
      if (w.error) { setSalvando(false); return setErro(mensagemErro(w.error)); }
      await pedirPermissao();
    } else if (atual) {
      await supabase.from("lembretes").delete().eq("id", atual.id);
    }
    await sincronizarLembretes().catch(() => {});
    setSalvando(false);
    nav.voltar();
  }

  return (
    <Tela titulo={tarefa ? "Mudar tarefa" : "Nova tarefa"} voltar>
      <Escolha rotulo="Tarefa" valor={escolhida} permitirVazio colunas={2}
        aoEscolher={(v) => { setEscolhida(v); setTitulo(""); if (v && !rec) setRec(REPETE_TODO_DIA.includes(v) ? "diaria" : "unica"); }}
        opcoes={TAREFAS_PRONTAS.map((x) => ({ valor: x, rotulo: x }))} />
      <Campo rotulo="Ou escreva outra (opcional)" value={titulo} onChangeText={(v) => { setTitulo(v); if (v) setEscolhida(null); }} maxLength={120} />
      {lista.length > 1 && (
        <Escolha rotulo="Animal" permitirVazio valor={animal} aoEscolher={setAnimal} opcoes={lista.map((a: any) => ({ valor: a.id, rotulo: a.nome, icone: "horse-variant" }))} />
      )}
      <Escolha rotulo="Quando?" valor={quando} aoEscolher={setQuando}
        opcoes={[{ valor: "hoje", rotulo: "Hoje" }, { valor: "amanha", rotulo: "Amanhã" }, { valor: "7", rotulo: "Em 7 dias" }, { valor: "outro", rotulo: "Outro dia" }]} />
      {quando === "outro" && <Campo rotulo="Dia" value={data} onChangeText={(t) => setData(mascaraData(t))} keyboardType="number-pad" placeholder="dia/mês/ano" />}
      <Escolha rotulo="Repetir" valor={rec} aoEscolher={setRec} opcoes={RECORRENCIAS} colunas={2} />
      <Escolha rotulo="Quem faz" permitirVazio valor={quem} aoEscolher={setQuem} opcoes={QUEM_FEZ.map((x) => ({ valor: x, rotulo: x }))} />
      {temDespertador ? (
        <>
          <Escolha rotulo="Tocar no celular" valor={aviso} aoEscolher={setAviso}
            opcoes={[{ valor: "nao", rotulo: "Não" }, { valor: "0", rotulo: "No dia" }, { valor: "1", rotulo: "1 dia antes" }, { valor: "3", rotulo: "3 dias antes" }]} />
          {aviso && aviso !== "nao" && <Horarios rotulo="Que horas?" prontos={["06:00", "07:00", "08:00", "12:00", "17:00"]} valores={hora} aoMudar={(v) => setHora(v.slice(-1))} maximo={1} />}
        </>
      ) : null}
      <Aviso texto={erro} tipo="erro" />
      <Botao titulo="Guardar" icone="check" onPress={salvar} carregando={salvando} />
      {tarefa && (
        <View style={{ marginTop: 20 }}>
          <BotaoConfirmar titulo="Não repetir mais (parar)" icone="stop-circle-outline" onConfirmar={async () => {
            const { error } = await supabase.from("tasks").update({ ativo: false }).eq("id", tarefa.id);
            if (error) return setErro(mensagemErro(error));
            await supabase.from("lembretes").delete().eq("task_id", tarefa.id);
            sincronizarLembretes().catch(() => {});
            nav.voltar();
          }} />
        </View>
      )}
    </Tela>
  );
}

// ---------- Tela aberta pelo toque no aviso ----------
export function LembreteFeito({ id, horario }: { id: string; horario: string }) {
  const nav = useNav();
  const [msg, setMsg] = useState<{ t: string; tipo: "ok" | "erro" } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const lb = useCarga(async () => (await supabase.from("lembretes").select("*, animals(nome)").eq("id", id).maybeSingle()).data as Lembrete | null, [id]);
  const l = lb.dados;
  async function feito() {
    if (!l || ocupado) return;
    setOcupado(true);
    if (l.tipo === "tarefa" && l.task_id) {
      const { data: t } = await supabase.from("tasks").select("*").eq("id", l.task_id).maybeSingle();
      const r = t ? await concluirTarefa(t) : { erro: "Tarefa não encontrada." };
      setOcupado(false);
      return setMsg(r.erro ? { t: r.erro, tipo: "erro" } : { t: "Feito e anotado.", tipo: "ok" });
    }
    const r = await marcarLembrete(l.id, horario);
    setOcupado(false);
    setMsg(r.erro ? { t: r.erro, tipo: "erro" } : { t: r.ja ? "Já estava marcado como feito." : l.animal_id ? "Feito e anotado no caderno." : "Feito.", tipo: "ok" });
  }
  if (lb.carregando && !l) return <Tela titulo="Lembrete" voltar><Carregando /></Tela>;
  if (!l) return <Tela titulo="Lembrete" voltar><Vazio texto="Esse lembrete foi apagado." /></Tela>;
  return (
    <Tela titulo="Lembrete" voltar>
      <Cartao>
        <View style={[est.linha, { gap: 12 }]}>
          <Icone nome={iconeLembrete(l.tipo)} tamanho={40} cor={cor.mata} />
          <View style={{ flex: 1 }}>
            <Text style={[est.texto, { fontWeight: "700", fontSize: tam.subtitulo }]}>{l.titulo}</Text>
            <Text style={est.textoSuave}>{[horario, l.animals?.nome].filter(Boolean).join(" · ")}</Text>
          </View>
        </View>
      </Cartao>
      {l.tipo === "reposicao" ? (
        <Botao titulo="Abrir o estoque" icone="package-variant-closed" onPress={() => nav.ir("Estoque")} />
      ) : msg?.tipo === "ok" ? (
        <>
          <Aviso texto={msg.t} tipo="ok" />
          <Botao titulo="Voltar ao início" tipo="leve" onPress={() => nav.aba("Inicio")} />
        </>
      ) : (
        <>
          <Botao titulo="Feito" icone="check-bold" onPress={feito} carregando={ocupado} style={{ minHeight: 80 }} />
          <Botao titulo="Ainda não" tipo="leve" onPress={() => nav.aba("Inicio")} />
          <Aviso texto={msg?.t} tipo="erro" />
        </>
      )}
    </Tela>
  );
}
