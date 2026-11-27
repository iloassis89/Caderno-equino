import React, { useState } from "react";
import { Text, View } from "react-native";
import { supabase, mensagemErro } from "../supabase";
import { carregarAnimais, useCarga } from "../dados";
import { Aviso, Botao, Cabecalho, Campo, Carregando, Cartao, Escolha, Rotulado, Selo, Tela, Vazio, useNav } from "../ui";
import { CATEGORIAS, STATUS, rotuloCategoria } from "../constantes";
import { br, hojeISO, mascaraData, paraISO, somarDias } from "../datas";
import { cor, est } from "../tema";

// ---------- Item de registro ----------
export function ItemRegistro({ r, mostrarAnimal = true }: { r: any; mostrarAnimal?: boolean }) {
  const nav = useNav();
  return (
    <Cartao onPress={() => nav.ir("NovoRegistro", { registro: r })}>
      <View style={est.entre}>
        <Text style={[est.texto, { fontWeight: "700", flex: 1 }]}>
          {mostrarAnimal && r.animals?.nome ? `${r.animals.nome} · ` : ""}{rotuloCategoria(r.categoria)}
        </Text>
        <Selo status={r.status} />
      </View>
      <Text style={est.textoSuave}>{br(r.data)}{r.responsavel ? ` · ${r.responsavel}` : ""}</Text>
      <Text style={[est.texto, { marginTop: 4 }]}>{r.descricao}</Text>
      {r.peso_kg != null && <Rotulado rotulo="Peso" valor={`${Number(r.peso_kg).toLocaleString("pt-BR")} kg`} />}
      {r.escore_corporal != null && <Rotulado rotulo="Escore corporal" valor={String(r.escore_corporal).replace(".", ",")} />}
      <Rotulado rotulo="Evidência" valor={r.evidencia} />
      <Rotulado rotulo="Decisão necessária" valor={r.decisao_necessaria} />
      <Rotulado rotulo="Próximo passo" valor={r.proximo_passo} />
    </Cartao>
  );
}

// ---------- Lista com filtros ----------
const PERIODOS = [
  { valor: "7", rotulo: "7 dias" }, { valor: "30", rotulo: "30 dias" },
  { valor: "90", rotulo: "90 dias" }, { valor: "tudo", rotulo: "Tudo" },
];

export function Registros() {
  const nav = useNav();
  const [animal, setAnimal] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<string | null>("30");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const animais = useCarga(() => carregarAnimais(false));
  const { dados, carregando } = useCarga(async () => {
    let q = supabase.from("records").select("*, animals(nome)").order("data", { ascending: false }).order("created_at", { ascending: false }).limit(200);
    if (animal) q = q.eq("animal_id", animal);
    if (categoria) q = q.eq("categoria", categoria);
    if (status) q = q.eq("status", status);
    if (periodo && periodo !== "tudo") q = q.gte("data", somarDias(hojeISO(), -Number(periodo)));
    const { data } = await q;
    return data ?? [];
  }, [animal, periodo, categoria, status]);

  return (
    <Tela titulo="Registros" subtitulo="Filtre por animal, período, categoria e status.">
      <Botao titulo="+ Novo registro" onPress={() => nav.ir("NovoRegistro")} />
      <View style={{ height: 10 }} />
      <Escolha rotulo="Animal" permitirVazio valor={animal} aoEscolher={setAnimal}
        opcoes={(animais.dados ?? []).map((a: any) => ({ valor: a.id, rotulo: a.nome }))} />
      <Escolha rotulo="Período" valor={periodo} aoEscolher={setPeriodo} opcoes={PERIODOS} />
      <Escolha rotulo="Status" permitirVazio valor={status} aoEscolher={setStatus} opcoes={STATUS} />
      <Escolha rotulo="Categoria" permitirVazio valor={categoria} aoEscolher={setCategoria} opcoes={CATEGORIAS} />
      <Cabecalho texto={carregando ? "Carregando…" : `${dados?.length ?? 0} registro(s)`} />
      {carregando && !dados ? <Carregando /> : (dados ?? []).length === 0 ? <Vazio texto="Nenhum registro com esses filtros." /> :
        (dados ?? []).map((r: any) => <ItemRegistro key={r.id} r={r} />)}
    </Tela>
  );
}

// ---------- Novo / editar registro ----------
export function NovoRegistro({ registro, animalId }: { registro?: any; animalId?: string }) {
  const nav = useNav();
  const animais = useCarga(() => carregarAnimais(true));
  const [animal, setAnimal] = useState<string | null>(registro?.animal_id ?? animalId ?? null);
  const [data, setData] = useState(registro ? br(registro.data) : br(hojeISO()));
  const [categoria, setCategoria] = useState<string | null>(registro?.categoria ?? null);
  const [status, setStatus] = useState<string | null>(registro?.status ?? null);
  const [descricao, setDescricao] = useState(registro?.descricao ?? "");
  const [responsavel, setResponsavel] = useState(registro?.responsavel ?? "");
  const [evidencia, setEvidencia] = useState(registro?.evidencia ?? "");
  const [decisao, setDecisao] = useState(registro?.decisao_necessaria ?? "");
  const [proximo, setProximo] = useState(registro?.proximo_passo ?? "");
  const [peso, setPeso] = useState(registro?.peso_kg != null ? String(registro.peso_kg).replace(".", ",") : "");
  const [escore, setEscore] = useState(registro?.escore_corporal != null ? String(registro.escore_corporal).replace(".", ",") : "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const ehMedida = categoria === "escore_peso_medidas";
  const ehSinal = categoria === "sinal_avaliacao_profissional";

  function numero(t: string) {
    if (!t.trim()) return null;
    const n = Number(t.replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }

  async function salvar() {
    setErro(null);
    if (!animal) return setErro("Escolha o animal.");
    if (!categoria) return setErro("Escolha a categoria.");
    if (!status) return setErro("Escolha o status: o que foi feito, o que está planejado ou o que depende de confirmação.");
    const dataISO = paraISO(data);
    if (!dataISO) return setErro("Data inválida. Use DD/MM/AAAA.");
    if (!descricao.trim()) return setErro("Descreva o que foi observado ou feito.");
    const p = numero(peso), e = numero(escore);
    if (Number.isNaN(p) || (p != null && p <= 0)) return setErro("Peso inválido.");
    if (Number.isNaN(e) || (e != null && (e < 1 || e > 9))) return setErro("Escore corporal deve ficar entre 1 e 9.");

    setSalvando(true);
    const linha = {
      animal_id: animal, data: dataISO, categoria, status, descricao: descricao.trim(),
      responsavel: responsavel.trim() || null, evidencia: evidencia.trim() || null,
      decisao_necessaria: decisao.trim() || null, proximo_passo: proximo.trim() || null,
      peso_kg: p, escore_corporal: e,
    };
    const { error } = registro
      ? await supabase.from("records").update(linha).eq("id", registro.id)
      : await supabase.from("records").insert(linha);
    setSalvando(false);
    if (error) return setErro(mensagemErro(error));
    nav.voltar();
  }

  return (
    <Tela titulo={registro ? "Editar registro" : "Novo registro"} voltar
      subtitulo="Registre o que aconteceu. Não presuma o que não foi visto.">
      <Escolha rotulo="Animal *" valor={animal} aoEscolher={setAnimal}
        opcoes={(animais.dados ?? []).map((a: any) => ({ valor: a.id, rotulo: a.nome }))} />
      {animais.dados && animais.dados.length === 0 && <Aviso texto="Cadastre um animal antes de registrar." />}
      <Campo rotulo="Data *" value={data} onChangeText={(t) => setData(mascaraData(t))} keyboardType="number-pad" placeholder="DD/MM/AAAA" />
      <Escolha rotulo="Categoria *" valor={categoria} aoEscolher={setCategoria} opcoes={CATEGORIAS} />
      <Escolha rotulo="Status *" valor={status} aoEscolher={setStatus} opcoes={STATUS} />
      {ehSinal && (
        <Aviso texto="Sinal que exige avaliação: descreva o que viu. O app não sugere diagnóstico nem medicamento. Em caso de urgência, chame o veterinário." />
      )}
      {categoria === "medicamento_suplemento" && (
        <Aviso texto="Registre aqui só o que já foi dado, com o nome e a dose que constam na receita ou na embalagem." />
      )}
      <Campo rotulo="O que foi observado ou feito *" value={descricao} onChangeText={setDescricao} multiline />
      {(ehMedida || peso || escore) ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}><Campo rotulo="Peso (kg)" value={peso} onChangeText={setPeso} keyboardType="decimal-pad" /></View>
          <View style={{ flex: 1 }}><Campo rotulo="Escore corporal (1–9)" value={escore} onChangeText={setEscore} keyboardType="decimal-pad" /></View>
        </View>
      ) : null}
      <Campo rotulo="Responsável" value={responsavel} onChangeText={setResponsavel} placeholder="Quem fez ou observou" />
      <Campo rotulo="Evidência" value={evidencia} onChangeText={setEvidencia} placeholder="Ex.: foto no celular, nota da compra, receita" />
      <Campo rotulo="Decisão necessária" value={decisao} onChangeText={setDecisao} placeholder="O que precisa ser decidido, e por quem" />
      <Campo rotulo="Próximo passo" value={proximo} onChangeText={setProximo} />
      <Aviso texto={erro} tipo="erro" />
      <Botao titulo="Salvar registro" onPress={salvar} carregando={salvando} />
      {registro && (
        <Botao titulo="Excluir registro" tipo="leve" style={{ borderColor: cor.barro }} onPress={async () => {
          const { error } = await supabase.from("records").delete().eq("id", registro.id);
          if (error) return setErro(mensagemErro(error));
          nav.voltar();
        }} />
      )}
    </Tela>
  );
}

// ---------- Ficha do animal ----------
export function Ficha({ id }: { id: string }) {
  const nav = useNav();
  const { dados, carregando } = useCarga(async () => {
    const [a, r] = await Promise.all([
      supabase.from("animals").select("*").eq("id", id).single(),
      supabase.from("records").select("*").eq("animal_id", id).order("data", { ascending: false }).limit(300),
    ]);
    return { animal: a.data, registros: r.data ?? [] };
  }, [id]);
  const [cat, setCat] = useState<string | null>(null);

  if (carregando && !dados) return <Tela titulo="Ficha" voltar><Carregando /></Tela>;
  const { animal, registros } = dados!;
  if (!animal) return <Tela titulo="Ficha" voltar><Vazio texto="Animal não encontrado." /></Tela>;

  const medidas = registros.filter((r: any) => r.peso_kg != null || r.escore_corporal != null);
  const filtrados = cat ? registros.filter((r: any) => r.categoria === cat) : registros;

  return (
    <Tela titulo={animal.nome} voltar subtitulo={[animal.raca, animal.pelagem, animal.data_nascimento ? `Nasc. ${br(animal.data_nascimento)}` : null].filter(Boolean).join(" · ") || undefined}
      acao={<Botao titulo="Editar" tipo="leve" style={{ marginTop: 0, paddingVertical: 6 }} onPress={() => nav.ir("NovoAnimal", { animal })} />}>
      {animal.observacoes ? <Text style={[est.texto, { marginBottom: 8 }]}>{animal.observacoes}</Text> : null}
      <Botao titulo="+ Registro para este animal" onPress={() => nav.ir("NovoRegistro", { animalId: animal.id })} />

      <Cabecalho texto="Evolução de peso e escore" />
      {medidas.length === 0 ? <Vazio texto="Sem medições registradas." /> : (
        <Cartao>
          {medidas.slice(0, 12).map((m: any, i: number) => {
            const ant = medidas[i + 1];
            const dp = ant && m.peso_kg != null && ant.peso_kg != null ? Number(m.peso_kg) - Number(ant.peso_kg) : null;
            const de = ant && m.escore_corporal != null && ant.escore_corporal != null ? Number(m.escore_corporal) - Number(ant.escore_corporal) : null;
            const sinal = (n: number) => (n > 0 ? `+${n.toLocaleString("pt-BR")}` : n.toLocaleString("pt-BR"));
            return (
              <View key={m.id} style={[est.entre, { paddingVertical: 6, borderBottomWidth: i < Math.min(medidas.length, 12) - 1 ? 1 : 0, borderColor: cor.linha }]}>
                <Text style={[est.texto, { width: 96 }]}>{br(m.data)}</Text>
                <Text style={[est.texto, { flex: 1 }]}>
                  {m.peso_kg != null ? `${Number(m.peso_kg).toLocaleString("pt-BR")} kg` : "—"}
                  {dp != null ? <Text style={{ color: cor.tintaSuave }}> ({sinal(dp)})</Text> : null}
                </Text>
                <Text style={[est.texto, { width: 90, textAlign: "right" }]}>
                  {m.escore_corporal != null ? `Escore ${String(m.escore_corporal).replace(".", ",")}` : "—"}
                  {de != null && de !== 0 ? <Text style={{ color: cor.tintaSuave }}> ({sinal(de)})</Text> : null}
                </Text>
              </View>
            );
          })}
          <Text style={[est.textoSuave, { fontSize: 12, marginTop: 6 }]}>Entre parênteses: diferença em relação à medição anterior.</Text>
        </Cartao>
      )}

      <Cabecalho texto={`Histórico (${filtrados.length})`} />
      <Escolha permitirVazio valor={cat} aoEscolher={setCat} opcoes={CATEGORIAS} />
      {filtrados.length === 0 ? <Vazio texto="Nenhum registro." /> : filtrados.map((r: any) => <ItemRegistro key={r.id} r={r} mostrarAnimal={false} />)}
    </Tela>
  );
}
