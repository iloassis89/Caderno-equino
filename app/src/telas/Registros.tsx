import React, { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { supabase, mensagemErro } from "../supabase";
import { carregarAnimais, DIAS_HISTORICO_GRATIS, ok, useCarga } from "../dados";
import {
  Aviso, Bloqueado, Botao, BotaoConfirmar, Cabecalho, Campo, Carregando, Cartao, ErroCarga, Escolha, EscolhaVarias, Icone, Rotulado, Selo, Tela, Vazio, useNav, usePlano,
} from "../ui";
import { CATEGORIAS, DICA_INTERVALO, LEMBRAR_DE_NOVO, OPCOES_ANOTACAO, QUEM_FEZ, STATUS, iconeCategoria, lerNumero, numBR, plural, rotuloCategoria } from "../constantes";
import { pedirPermissao, sincronizarLembretes, temDespertador } from "../lembretes";
import { br, hojeISO, mascaraData, paraISO, quando, somarDias } from "../datas";
import { pesoPelaFita } from "../nutricao";
import { Anexos, FotoAnimal } from "../anexos";
import { enviarPdf, enviarWhatsApp } from "../relatorio";
import { cor, est, tam } from "../tema";

// ---------- Item de anotação ----------
export function ItemRegistro({ r, mostrarAnimal = true }: { r: any; mostrarAnimal?: boolean }) {
  const nav = useNav();
  return (
    <Cartao onPress={() => nav.ir("NovoRegistro", { registro: r })}>
      <View style={[est.linha, { gap: 12, alignItems: "flex-start" }]}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: cor.mataClara, alignItems: "center", justifyContent: "center" }}>
          <Icone nome={iconeCategoria(r.categoria)} tamanho={26} cor={cor.mata} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[est.texto, { fontWeight: "700" }]} numberOfLines={2}>
            {mostrarAnimal && r.animals?.nome ? `${r.animals.nome} · ` : ""}{rotuloCategoria(r.categoria)}
          </Text>
          <View style={{ flexDirection: "row", marginVertical: 4 }}><Selo status={r.status} /></View>
          <Text style={est.textoSuave}>{quando(r.data)}{r.responsavel ? ` · ${r.responsavel}` : ""}</Text>
          <Text style={[est.texto, { marginTop: 4 }]} numberOfLines={3}>{r.descricao}</Text>
          {r.peso_kg != null && <Rotulado rotulo="Peso" valor={`${numBR(Number(r.peso_kg))} kg${r.medidas?.peso_estimado_fita ? " (fita)" : ""}`} />}
          {r.escore_corporal != null && <Rotulado rotulo="Escore" valor={numBR(Number(r.escore_corporal))} />}
        </View>
      </View>
    </Cartao>
  );
}

// ---------- Histórico com filtros ----------
export function Historico() {
  const { pago } = usePlano();
  const [animal, setAnimal] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<string | null>("30");
  const [status, setStatus] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [maisFiltros, setMaisFiltros] = useState(false);
  const periodos = pago
    ? [{ valor: "7", rotulo: "7 dias" }, { valor: "30", rotulo: "30 dias" }, { valor: "90", rotulo: "3 meses" }, { valor: "tudo", rotulo: "Tudo" }]
    : [{ valor: "7", rotulo: "7 dias" }, { valor: "30", rotulo: "30 dias" }];

  const animais = useCarga(() => carregarAnimais(false));
  const { dados, carregando, erro, recarregar } = useCarga(async () => {
    let q = supabase.from("records").select("*, animals(nome)").order("data", { ascending: false }).order("created_at", { ascending: false }).limit(300);
    if (animal) q = q.eq("animal_id", animal);
    if (categoria === "algo_diferente") q = q.in("categoria", ["ocorrencia", "sinal_avaliacao_profissional"]);
    else if (categoria) q = q.eq("categoria", categoria);
    if (status) q = q.eq("status", status);
    const escolhido = Number(periodo);
    const dias = !pago
      ? Math.min(Number.isFinite(escolhido) ? escolhido : DIAS_HISTORICO_GRATIS, DIAS_HISTORICO_GRATIS)
      : periodo === "tudo" ? null : Number.isFinite(escolhido) ? escolhido : 30;
    if (dias) q = q.gte("data", somarDias(hojeISO(), -dias));
    return ok(await q) ?? [];
  }, [animal, periodo, categoria, status, pago]);

  return (
    <Tela titulo="Todas as anotações" voltar>
      <Escolha rotulo="Animal" permitirVazio valor={animal} aoEscolher={setAnimal}
        opcoes={(animais.dados ?? []).map((a: any) => ({ valor: a.id, rotulo: a.nome, icone: "horse-variant" }))} />
      <Escolha rotulo="Período" valor={periodo} aoEscolher={setPeriodo} opcoes={periodos} />
      {!pago && <Text style={[est.textoSuave, { marginTop: -6, marginBottom: 10 }]}>No plano grátis aparecem os últimos 30 dias.</Text>}
      <Pressable onPress={() => setMaisFiltros((v) => !v)} style={{ minHeight: 44, justifyContent: "center" }} accessibilityRole="button">
        <Text style={{ color: cor.couro, fontSize: tam.texto, fontWeight: "700" }}>{maisFiltros ? "− Menos filtros" : "+ Filtrar"}</Text>
      </Pressable>
      {maisFiltros && (
        <>
          <Escolha rotulo="Situação" permitirVazio valor={status} aoEscolher={setStatus} opcoes={STATUS} />
          <Escolha rotulo="Assunto" permitirVazio valor={categoria} aoEscolher={setCategoria} opcoes={CATEGORIAS} colunas={2} />
        </>
      )}
      <ErroCarga erro={erro} tentar={recarregar} />
      <Cabecalho texto={carregando ? "Carregando…" : plural(dados?.length ?? 0, "anotação")} />
      {carregando && !dados ? <Carregando /> : (dados ?? []).length === 0 ? <Vazio texto="Nenhuma anotação com esses filtros." /> :
        (dados ?? []).map((r: any) => <ItemRegistro key={r.id} r={r} />)}
    </Tela>
  );
}

// ---------- Enviar ao veterinário (PDF e WhatsApp) ----------
export function EnviarEspecialista({ animalId }: { animalId: string }) {
  const { pago } = usePlano();
  const nav = useNav();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  if (!pago) {
    return (
      <Pressable onPress={() => nav.ir("Planos")} style={[est.linha, { gap: 8, minHeight: 48 }]} accessibilityRole="button">
        <Icone nome="lock-outline" tamanho={22} cor={cor.couro} />
        <Text style={{ color: cor.couro, fontSize: tam.pequeno, fontWeight: "700", flex: 1 }}>PDF e WhatsApp para o vet: no plano pago (R$ 9,90/mês)</Text>
      </Pressable>
    );
  }
  async function pdf() {
    setErro(null); setOcupado("pdf");
    // na web, abre a janela antes de carregar, para o navegador não bloquear
    // @ts-ignore
    const janela = Platform.OS === "web" ? window.open("", "_blank") : undefined;
    try { await enviarPdf(animalId, janela); } catch (e: any) { janela?.close(); setErro(mensagemErro(e)); } finally { setOcupado(null); }
  }
  async function zap() {
    setErro(null); setOcupado("zap");
    // @ts-ignore
    const janela = Platform.OS === "web" ? window.open("", "_blank") : undefined;
    try { await enviarWhatsApp(animalId, janela); } catch (e: any) { janela?.close(); setErro(mensagemErro(e)); } finally { setOcupado(null); }
  }
  return (
    <View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Botao titulo="PDF" icone="file-pdf-box" tipo="leve" style={{ flex: 1 }} onPress={pdf} carregando={ocupado === "pdf"} />
        <Botao titulo="WhatsApp" icone="whatsapp" tipo="leve" style={{ flex: 1 }} onPress={zap} carregando={ocupado === "zap"} />
      </View>
      {Platform.OS === "web" && <Text style={[est.textoSuave, { marginTop: 4 }]}>O PDF abre numa janela: escolha “Salvar como PDF” ou “Compartilhar”.</Text>}
      <Aviso texto={erro} tipo="erro" />
    </View>
  );
}

// ---------- Nova anotação / editar ----------
// Um toque escolhe; escrever é opcional. "Hoje" e "Feito" já vêm marcados.
const SEP = " · ";
function montarDescricao(marcados: string[], texto: string) {
  const a = marcados.join(SEP);
  const b = texto.trim();
  return a && b ? `${a} — ${b}` : a || b;
}

export function NovoRegistro({ registro, animalId }: { registro?: any; animalId?: string }) {
  const nav = useNav();
  const { pago } = usePlano();
  const animais = useCarga(() => carregarAnimais(true));
  const nomesUsados = useCarga(async () => {
    const { data } = await supabase.from("records").select("responsavel").not("responsavel", "is", null).order("created_at", { ascending: false }).limit(40);
    return [...new Set((data ?? []).map((r: any) => (typeof r.responsavel === "string" ? r.responsavel.trim() : "")).filter((n) => n && !QUEM_FEZ.includes(n)))].slice(0, 4);
  });
  const catInicial = registro ? (["ocorrencia", "sinal_avaliacao_profissional"].includes(registro.categoria) ? "algo_diferente" : registro.categoria) : null;
  const [animal, setAnimal] = useState<string | null>(registro?.animal_id ?? animalId ?? null);
  const [categoria, setCategoria] = useState<string | null>(catInicial);
  const [status, setStatus] = useState<string | null>(registro?.status ?? "realizado");
  const [quando, setQuando] = useState<string | null>(registro ? "outro" : "hoje");
  const [data, setData] = useState(registro ? br(registro.data) : br(hojeISO()));
  const [marcados, setMarcados] = useState<string[]>([]);
  const [texto, setTexto] = useState(registro?.descricao ?? "");
  const [escrever, setEscrever] = useState(!!registro);
  const [quem, setQuem] = useState<string | null>(registro?.responsavel ?? null);
  const [quemOutro, setQuemOutro] = useState("");
  const [lembrar, setLembrar] = useState<string | null>(registro ? null : "0");
  const [reproLembretes, setReproLembretes] = useState<string[]>([]);
  const [peso, setPeso] = useState(registro?.peso_kg != null ? String(registro.peso_kg).replace(".", ",") : "");
  const [comoPesou, setComoPesou] = useState<string | null>(registro?.medidas?.peso_estimado_fita ? "fita" : registro?.peso_kg != null ? "balanca" : null);
  const [escore, setEscore] = useState<string | null>(registro?.escore_corporal != null ? String(Math.round(Number(registro.escore_corporal))) : null);
  const [perimetro, setPerimetro] = useState(registro?.medidas?.perimetro_toracico_cm ? String(registro.medidas.perimetro_toracico_cm) : "");
  const [comprimento, setComprimento] = useState(registro?.medidas?.comprimento_corpo_cm ? String(registro.medidas.comprimento_corpo_cm) : "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState<{ id: string; animalId: string; resumo: string } | null>(null);

  const ehPeso = categoria === "escore_peso_medidas";
  const listaAnimais = animais.dados ?? [];
  useEffect(() => { if (!animal && listaAnimais.length === 1) setAnimal(listaAnimais[0].id); }, [animal, listaAnimais]);
  const grupos = categoria ? OPCOES_ANOTACAO[categoria] ?? [] : [];
  const cobriu = categoria === "reproducao" && marcados.some((m) => m === "Cobertura (monta)" || m === "Inseminação");
  const pesoFita = comoPesou === "fita" ? (() => { const p = lerNumero(perimetro), c = lerNumero(comprimento); return p && c ? pesoPelaFita(p, c) : null; })() : null;
  const opcoesQuem = [...QUEM_FEZ, ...(nomesUsados.dados ?? []), ...(quem && !QUEM_FEZ.includes(quem) && !(nomesUsados.dados ?? []).includes(quem) ? [quem] : [])];

  function marcar(grupo: { opcoes: string[]; uma?: boolean }, novos: string[]) {
    // nas perguntas de uma resposta só, fica só a última tocada
    const fora = marcados.filter((m) => !grupo.opcoes.includes(m));
    const doGrupo = novos.filter((m) => grupo.opcoes.includes(m));
    setMarcados([...fora, ...(grupo.uma ? doGrupo.slice(-1) : doGrupo)]);
  }

  function limpar() {
    setCategoria(null); setStatus("realizado"); setQuando("hoje"); setData(br(hojeISO())); setMarcados([]); setTexto(""); setEscrever(false);
    setQuem(null); setQuemOutro(""); setLembrar("0"); setReproLembretes([]); setPeso(""); setComoPesou(null); setEscore(null); setPerimetro(""); setComprimento("");
  }

  async function salvar() {
    setErro(null);
    if (!animal) return setErro("Escolha o animal.");
    if (!categoria) return setErro("Escolha o assunto.");
    if (!status) return setErro("Escolha se já fez.");
    const hoje = hojeISO();
    const dataISO = quando === "hoje" ? hoje : quando === "ontem" ? somarDias(hoje, -1) : quando === "amanha" ? somarDias(hoje, 1)
      : quando === "7" ? somarDias(hoje, 7) : paraISO(data);
    if (!dataISO) return setErro("Data inválida. Use dia/mês/ano, por exemplo 05/12/2026.");
    if (status === "realizado" && dataISO > hoje) return setErro("A data está no futuro. Se ainda vai fazer, escolha “Vou fazer”.");
    let p = ehPeso ? (comoPesou === "fita" ? pesoFita : lerNumero(peso)) : null;
    if (Number.isNaN(p) || (p != null && (p < 30 || p > 1500))) return setErro("Peso fora do normal. Confira o número (em kg).");
    if (ehPeso && comoPesou === "fita" && !p && (perimetro || comprimento)) return setErro("Para a fita, preencha a volta do peito e o comprimento, em cm.");
    const e = ehPeso && escore ? Number(escore) : null;
    let descricao = montarDescricao(marcados, texto);
    if (ehPeso && !descricao) descricao = [p ? `Peso ${numBR(p)} kg${comoPesou === "fita" ? " (fita)" : ""}` : "", e ? `escore ${e}` : ""].filter(Boolean).join(SEP);
    if (!descricao) return setErro("Toque em pelo menos uma opção ou escreva algo.");
    const pc = ehPeso ? lerNumero(perimetro) : null, cc = ehPeso ? lerNumero(comprimento) : null;
    const medidas = ehPeso && (pc || cc || comoPesou === "fita") ? { perimetro_toracico_cm: pc || null, comprimento_corpo_cm: cc || null, peso_estimado_fita: comoPesou === "fita" && !!p } : registro?.medidas ?? null;
    const cat = categoria === "algo_diferente" ? (status === "avaliacao_veterinaria" ? "sinal_avaliacao_profissional" : "ocorrencia") : categoria;
    const responsavel = (quemOutro.trim() || quem || "").trim() || null;

    setSalvando(true);
    const linha: Record<string, unknown> = { animal_id: animal, data: dataISO, categoria: cat, status, descricao: descricao.slice(0, 2000), responsavel };
    if (ehPeso) { linha.peso_kg = p; linha.escore_corporal = e; linha.medidas = medidas; }
    const res = registro
      ? await supabase.from("records").update(linha).eq("id", registro.id).select("id").single()
      : await supabase.from("records").insert(linha).select("id").single();
    if (res.error) { setSalvando(false); return setErro(mensagemErro(res.error)); }

    // "Lembrar de novo" vira uma tarefa com data (e toca no celular)
    const tarefas: { titulo: string; dia: string }[] = [];
    const resumo = rotuloCategoria(cat) + (marcados.length ? `: ${marcados.slice(0, 3).join(", ")}` : "");
    if (lembrar && lembrar !== "0") tarefas.push({ titulo: resumo.slice(0, 120), dia: somarDias(dataISO, Number(lembrar)) });
    if (cobriu && reproLembretes.includes("prenhez")) tarefas.push({ titulo: "Exame de prenhez (veterinário)", dia: somarDias(dataISO, 15) });
    if (cobriu && reproLembretes.includes("parto")) tarefas.push({ titulo: `Parto previsto ${br(somarDias(dataISO, 340))}: preparar maternidade e avisar o vet`, dia: somarDias(dataISO, 320) });
    for (const t of tarefas) {
      const nova = await supabase.from("tasks").insert({ titulo: t.titulo, animal_id: animal, recorrencia: "unica", proxima_data: t.dia, responsavel }).select("id").single();
      if (!nova.error && temDespertador) {
        await supabase.from("lembretes").insert({ tipo: "tarefa", titulo: t.titulo, animal_id: animal, task_id: nova.data.id, horarios: ["07:00"], antecedencia_dias: 1 });
      }
    }
    if (tarefas.length && temDespertador) { await pedirPermissao(); sincronizarLembretes().catch(() => {}); }
    setSalvando(false);
    if (registro) return nav.voltar();
    setSalvo({ id: res.data.id, animalId: animal, resumo: `${resumo}${tarefas.length ? ` · lembrete em ${br(tarefas[0].dia)}` : ""}` });
    limpar();
  }

  return (
    <Tela titulo={registro ? "Mudar anotação" : "Anotar"} voltar={!!registro || !!animalId}>
      {salvo && (
        <Cartao style={{ backgroundColor: cor.mataClara, borderColor: cor.mata }}>
          <View style={[est.linha, { gap: 10 }]}>
            <Icone nome="check-circle" tamanho={32} cor={cor.mata} />
            <Text style={[est.texto, { flex: 1, fontWeight: "700" }]}>Guardado. {salvo.resumo}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {pago && <Botao titulo="Juntar foto" tipo="leve" icone="camera-outline" style={{ flex: 1 }} onPress={() => nav.ir("FotosAnotacao", { recordId: salvo.id, animalId: salvo.animalId })} />}
            <Botao titulo="Ver ficha" tipo="leve" icone="horse-variant" style={{ flex: 1 }} onPress={() => nav.ir("Ficha", { id: salvo.animalId })} />
          </View>
        </Cartao>
      )}
      {listaAnimais.length > 1 && (
        <Escolha rotulo="Animal" valor={animal} aoEscolher={setAnimal}
          opcoes={listaAnimais.map((a: any) => ({ valor: a.id, rotulo: a.nome, icone: "horse-variant" }))} />
      )}
      {animais.dados && listaAnimais.length === 0 && (
        <Cartao><Text style={est.texto}>Primeiro cadastre um animal.</Text><Botao titulo="Cadastrar animal" icone="plus-circle" onPress={() => nav.ir("NovoAnimal")} /></Cartao>
      )}
      <Escolha rotulo="O quê?" valor={categoria} aoEscolher={(v) => { setCategoria(v); setMarcados([]); setSalvo(null); }} opcoes={CATEGORIAS} colunas={2} />

      {categoria && (
        <>
          {categoria === "algo_diferente" && <Aviso texto="Marque o que viu. O app não dá diagnóstico. Se for urgente (cólica, sangramento, animal caído), ligue para o veterinário agora." />}
          {categoria === "medicamento_suplemento" && <Aviso texto="Anote só o que já foi dado ou o que o veterinário marcou. Nome e dose: copie da receita ou da embalagem em “Escrever mais”." />}
          {grupos.map((g) => (
            <EscolhaVarias key={g.rotulo} rotulo={g.rotulo} valores={marcados.filter((m) => g.opcoes.includes(m))}
              aoMudar={(v) => marcar(g, v)} opcoes={g.opcoes.map((o) => ({ valor: o, rotulo: o }))} />
          ))}
          {categoria === "reproducao" && marcados.some((m) => m.startsWith("Potro") || m.startsWith("Mamou") || m.startsWith("Placenta")) && (
            <Aviso texto="Se o potro não ficou de pé em 1 hora, não mamou em 2 horas ou a placenta não saiu em 3 horas, chame o veterinário." />
          )}

          {ehPeso && (
            <Cartao>
              <Escolha rotulo="Como pesou?" valor={comoPesou} aoEscolher={setComoPesou} permitirVazio
                opcoes={[{ valor: "balanca", rotulo: "Balança", icone: "scale" }, { valor: "fita", rotulo: "Fita métrica", icone: "tape-measure" }]} />
              {comoPesou === "balanca" && <Campo rotulo="Peso (kg)" value={peso} onChangeText={setPeso} keyboardType="decimal-pad" />}
              {comoPesou === "fita" && (
                <>
                  <Campo rotulo="Volta do peito (cm)" value={perimetro} onChangeText={setPerimetro} keyboardType="decimal-pad"
                    dica="Logo atrás da cernelha e dos cotovelos, ao redor do peito." />
                  <Campo rotulo="Comprimento do corpo (cm)" value={comprimento} onChangeText={setComprimento} keyboardType="decimal-pad"
                    dica="Da ponta do ombro até a ponta da nádega." />
                  {pesoFita ? <Text style={[est.texto, { fontWeight: "700", marginBottom: 8 }]}>Peso estimado: {numBR(pesoFita)} kg (pode errar ~10%)</Text> : null}
                </>
              )}
              <Escolha rotulo="Escore corporal (1 = muito magro · 5 = ideal · 9 = muito gordo)" valor={escore} aoEscolher={setEscore} permitirVazio
                opcoes={["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => ({ valor: n, rotulo: n }))} />
            </Cartao>
          )}

          <Escolha rotulo="Já fez?" valor={status} aoEscolher={(v) => { setStatus(v); if (v === "planejado" && (quando === "hoje" || quando === "ontem")) setQuando("amanha"); if (v !== "planejado" && (quando === "amanha" || quando === "7")) setQuando("hoje"); }}
            opcoes={STATUS} colunas={2} />
          <Escolha rotulo="Quando?" valor={quando} aoEscolher={setQuando}
            opcoes={status === "planejado"
              ? [{ valor: "hoje", rotulo: "Hoje" }, { valor: "amanha", rotulo: "Amanhã" }, { valor: "7", rotulo: "Em 7 dias" }, { valor: "outro", rotulo: "Outro dia" }]
              : [{ valor: "hoje", rotulo: "Hoje" }, { valor: "ontem", rotulo: "Ontem" }, { valor: "outro", rotulo: "Outro dia" }]} />
          {quando === "outro" && <Campo rotulo="Dia" value={data} onChangeText={(t) => setData(mascaraData(t))} keyboardType="number-pad" placeholder="dia/mês/ano" />}

          <Escolha rotulo="Quem fez?" valor={quem} permitirVazio aoEscolher={(v) => { setQuem(v); setQuemOutro(""); }}
            opcoes={opcoesQuem.map((x) => ({ valor: x, rotulo: x }))} />

          {escrever ? (
            <Campo rotulo="Escrever mais (opcional)" value={texto} onChangeText={setTexto} multiline
              placeholder={categoria === "medicamento_suplemento" ? "Nome e dose da receita" : "Ex.: comeu toda a ração da manhã"} />
          ) : (
            <Pressable onPress={() => setEscrever(true)} style={{ minHeight: 48, justifyContent: "center", marginBottom: 6 }} accessibilityRole="button">
              <Text style={{ color: cor.couro, fontSize: tam.texto, fontWeight: "700" }}>+ Escrever mais (opcional)</Text>
            </Pressable>
          )}

          {!registro && (
            <>
              {categoria === "reproducao" && cobriu ? (
                <EscolhaVarias rotulo={`Lembretes da cobertura (parto previsto perto de ${br(somarDias(quando === "outro" ? paraISO(data) ?? hojeISO() : quando === "ontem" ? somarDias(hojeISO(), -1) : hojeISO(), 340))})`}
                  valores={reproLembretes} aoMudar={setReproLembretes}
                  opcoes={[{ valor: "prenhez", rotulo: "Exame de prenhez em 15 dias" }, { valor: "parto", rotulo: "Avisar no dia 320 (perto do parto)" }]} />
              ) : null}
              <Escolha rotulo="Lembrar de novo?" valor={lembrar} aoEscolher={setLembrar} opcoes={LEMBRAR_DE_NOVO} />
              {DICA_INTERVALO[categoria] ? <Text style={[est.textoSuave, { marginTop: -6, marginBottom: 10 }]}>{DICA_INTERVALO[categoria]}</Text> : null}
            </>
          )}
        </>
      )}
      <Aviso texto={erro} tipo="erro" />
      {categoria && <Botao titulo="Guardar" icone="check" onPress={salvar} carregando={salvando} style={{ minHeight: 64 }} />}
      {registro && (
        <View style={{ marginTop: 20 }}>
          <BotaoConfirmar titulo="Apagar anotação" onConfirmar={async () => {
            const { error } = await supabase.from("records").delete().eq("id", registro.id);
            if (error) return setErro(mensagemErro(error));
            nav.voltar();
          }} />
        </View>
      )}
    </Tela>
  );
}

// Fotos de uma anotação (aberta pelo "Juntar foto")
export function FotosAnotacao({ recordId, animalId }: { recordId: string; animalId: string }) {
  const { pago } = usePlano();
  return (
    <Tela titulo="Fotos da anotação" voltar>
      {pago ? <Anexos animalId={animalId} recordId={recordId} tipo="evidencia" vazio="Nenhuma foto ainda. Use os botões abaixo." />
        : <Bloqueado titulo="Fotos nas anotações" />}
    </Tela>
  );
}

// ---------- Ficha do animal ----------
export function Ficha({ id }: { id: string }) {
  const nav = useNav();
  const { pago } = usePlano();
  const { dados, carregando, erro, recarregar } = useCarga(async () => {
    let q = supabase.from("records").select("*").eq("animal_id", id).order("data", { ascending: false }).order("created_at", { ascending: false }).limit(300);
    if (!pago) q = q.gte("data", somarDias(hojeISO(), -DIAS_HISTORICO_GRATIS));
    const [a, r] = await Promise.all([supabase.from("animals").select("*").eq("id", id).single(), q]);
    return { animal: ok(a), registros: ok(r) ?? [] };
  }, [id, pago]);

  if (erro && !dados) return <Tela titulo="Ficha" voltar><ErroCarga erro={erro} tentar={recarregar} /></Tela>;
  if (carregando && !dados) return <Tela titulo="Ficha" voltar><Carregando /></Tela>;
  const { animal, registros } = dados!;
  if (!animal) return <Tela titulo="Ficha" voltar><Vazio texto="Animal não encontrado." /></Tela>;
  const medidas = registros.filter((r: any) => r.status === "realizado" && (r.peso_kg != null || r.escore_corporal != null));
  const sexo = animal.sexo === "femea" ? "Fêmea" : animal.sexo === "macho" ? "Macho" : animal.sexo === "macho_castrado" ? "Macho castrado" : null;

  const ultimaMedida = medidas[0];
  return (
    <Tela titulo={animal.nome} voltar
      acao={<Botao titulo="Editar" tipo="leve" icone="pencil-outline" style={{ marginTop: 0, minHeight: 48 }} onPress={() => nav.ir("NovoAnimal", { animal })} />}>
      <View style={[est.linha, { gap: 14, marginBottom: 8 }]}>
        <FotoAnimal animalId={animal.id} tamanho={100} />
        <View style={{ flex: 1 }}>
          <Text style={est.texto}>{[animal.raca, animal.pelagem, sexo].filter(Boolean).join(" · ") || "Sem raça e pelagem"}</Text>
          {animal.data_nascimento ? <Text style={est.textoSuave}>Nasceu em {br(animal.data_nascimento)}</Text> : null}
          {ultimaMedida ? (
            <Text style={[est.texto, { fontWeight: "700", marginTop: 4 }]}>
              {[ultimaMedida.peso_kg != null ? `${numBR(Number(ultimaMedida.peso_kg))} kg${ultimaMedida.medidas?.peso_estimado_fita ? "*" : ""}` : null,
                ultimaMedida.escore_corporal != null ? `escore ${numBR(Number(ultimaMedida.escore_corporal))}` : null, quando(ultimaMedida.data)].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
        </View>
      </View>
      <Botao titulo="Anotar" icone="plus-circle" onPress={() => nav.ir("NovoRegistro", { animalId: animal.id })} />
      <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
        <Bloco icone="sack" texto="Alimentação" onPress={() => nav.ir("Dieta", { animalId: animal.id, nome: animal.nome })} />
        <Bloco icone="file-document-outline" texto="Documentos" onPress={() => nav.ir("Documentos", { animalId: animal.id, nome: animal.nome })} />
      </View>

      <Cabecalho texto="Enviar ao veterinário" />
      <EnviarEspecialista animalId={animal.id} />

      {pago && medidas.length > 1 && (
        <>
          <Cabecalho texto="Peso" />
          <Cartao>
            {medidas.slice(0, 12).map((m: any, i: number) => {
              const ant = medidas[i + 1];
              const dp = ant && m.peso_kg != null && ant.peso_kg != null ? Number(m.peso_kg) - Number(ant.peso_kg) : null;
              return (
                <View key={m.id} style={[est.entre, { paddingVertical: 8, borderBottomWidth: 1, borderColor: cor.linha }]}>
                  <Text style={est.texto}>{br(m.data)}</Text>
                  <Text style={[est.texto, { fontWeight: "700" }]}>
                    {m.peso_kg != null ? `${numBR(Number(m.peso_kg))} kg${m.medidas?.peso_estimado_fita ? "*" : ""}` : "—"}
                    {dp != null ? <Text style={{ color: cor.tintaSuave, fontWeight: "400" }}> ({dp > 0 ? "+" : ""}{numBR(dp)})</Text> : null}
                  </Text>
                  <Text style={est.texto}>{m.escore_corporal != null ? `Escore ${numBR(Number(m.escore_corporal))}` : ""}</Text>
                </View>
              );
            })}
            {medidas.some((m: any) => m.medidas?.peso_estimado_fita) && <Text style={[est.textoSuave, { marginTop: 8 }]}>* estimado pela fita</Text>}
          </Cartao>
        </>
      )}

      <Cabecalho texto={pago ? `Anotações (${registros.length})` : `Últimos ${DIAS_HISTORICO_GRATIS} dias (${registros.length})`} />
      {registros.length === 0 ? <Vazio texto="Nenhuma anotação ainda. Toque em Anotar." /> : registros.slice(0, 50).map((r: any) => <ItemRegistro key={r.id} r={r} mostrarAnimal={false} />)}
    </Tela>
  );
}

function Bloco({ icone, texto, onPress }: { icone: string; texto: string; onPress: () => void }) {
  return (
    <Cartao onPress={onPress} style={{ flex: 1, alignItems: "center", paddingVertical: 16, marginBottom: 0 }}>
      <Icone nome={icone} tamanho={34} cor={cor.mata} />
      <Text style={[est.texto, { fontWeight: "700", marginTop: 4 }]}>{texto}</Text>
    </Cartao>
  );
}

// ---------- Documentos e fotos do animal ----------
export function Documentos({ animalId, nome }: { animalId: string; nome: string }) {
  return (
    <Tela titulo="Documentos e fotos" voltar subtitulo={nome}>
      <Cabecalho texto="Foto do animal" />
      <Anexos animalId={animalId} tipo="foto_animal" vazio="Sem foto. Tire uma foto ou escolha da galeria." />
      <Cabecalho texto="Registro do animal" />
      <Text style={[est.textoSuave, { marginBottom: 8 }]}>Certificado de registro da associação, GTA, exames ou qualquer papel do animal. Fotografe o papel ou anexe o arquivo PDF.</Text>
      <Anexos animalId={animalId} tipo="registro" vazio="Nenhum documento guardado." />
    </Tela>
  );
}
