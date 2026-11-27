import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { supabase, mensagemErro } from "../supabase";
import { useCarga } from "../dados";
import { Aviso, Botao, BotaoConfirmar, Cabecalho, Campo, Carregando, Cartao, Escolha, EscolhaVarias, Icone, Tela, Vazio, useNav } from "../ui";
import { chamarFuncao } from "../supabase";
import { lerNumero, numBR } from "../constantes";
import { calcularDieta, CUIDADOS, infoTipoDieta, REFERENCIAS, TIPOS_DIETA, type Situacao } from "../nutricao";
import { br } from "../datas";
import { cor, est, tam } from "../tema";

const corSituacao: Record<Situacao, [string, string, string]> = {
  dentro: [cor.mataClara, cor.mata, "check-circle-outline"],
  abaixo: [cor.ouroClaro, cor.ouro, "arrow-down-circle-outline"],
  acima: [cor.barroClaro, cor.barro, "arrow-up-circle-outline"],
  sem_peso: [cor.couroClaro, cor.couro, "help-circle-outline"],
  incompleto: [cor.couroClaro, cor.couro, "help-circle-outline"],
};
const textoSituacao: Record<Situacao, string> = {
  dentro: "Dentro da referência", abaixo: "Abaixo da referência", acima: "Acima da referência", sem_peso: "Falta o peso do animal",
  incompleto: "Falta informação de algum alimento",
};

function Resultado({ titulo, valor, situacao, referencia }: { titulo: string; valor: string; situacao: Situacao; referencia: string }) {
  const [fundo, texto, icone] = corSituacao[situacao];
  return (
    <Cartao style={{ backgroundColor: fundo, borderColor: texto }}>
      <Text style={[est.texto, { fontWeight: "700" }]}>{titulo}</Text>
      <Text style={[est.texto, { fontSize: 22, marginVertical: 4 }]}>{valor}</Text>
      <View style={[est.linha, { gap: 6 }]}>
        <Icone nome={icone} cor={texto} />
        <Text style={{ color: texto, fontSize: tam.pequeno, fontWeight: "700" }}>{textoSituacao[situacao]}</Text>
      </View>
      <Text style={[est.textoSuave, { marginTop: 4 }]}>{referencia}</Text>
    </Cartao>
  );
}

const QTD = { kg: ["0,5", "1", "2", "3", "4", "5", "8", "10"], g: ["30", "50", "60", "100", "150", "200"] };

// ---------- Avaliação pela IA ----------
const CATEGORIAS_IA = [
  { valor: "manutencao", rotulo: "Pouco trabalho" }, { valor: "leve", rotulo: "Passeio leve" }, { valor: "moderado", rotulo: "Lida / marcha" },
  { valor: "intenso", rotulo: "Prova / lida pesada" }, { valor: "prenhe", rotulo: "Égua prenhe" }, { valor: "lactacao", rotulo: "Égua com potro" },
  { valor: "crescimento", rotulo: "Potro crescendo" }, { valor: "idoso", rotulo: "Idoso (20+ anos)" }, { valor: "reprodutor", rotulo: "Garanhão cobrindo" },
];
const CONDICOES_IA = [
  { valor: "obeso", rotulo: "Está gordo" }, { valor: "magro", rotulo: "Está magro" }, { valor: "pasto", rotulo: "Fica no pasto" },
  { valor: "laminite", rotulo: "Já teve laminite" }, { valor: "colica", rotulo: "Cólica recente" }, { valor: "dentes", rotulo: "Dentes ruins" }, { valor: "calor", rotulo: "Sua muito / calor" },
];
type Avaliacao = { resumo: string; bom: string[]; excessos: string[]; faltas: string[]; ajustes: string[]; falta_saber: string[]; alerta: string | null };

function ListaIA({ titulo, itens, icone, fundo, texto }: { titulo: string; itens: string[]; icone: string; fundo: string; texto: string }) {
  if (!itens.length) return null;
  return (
    <Cartao style={{ backgroundColor: fundo, borderColor: texto }}>
      <View style={[est.linha, { gap: 8, marginBottom: 6 }]}>
        <Icone nome={icone} cor={texto} />
        <Text style={[est.texto, { fontWeight: "700", color: texto }]}>{titulo}</Text>
      </View>
      {itens.map((t, i) => <Text key={i} style={[est.texto, { marginBottom: 4 }]}>• {t}</Text>)}
    </Cartao>
  );
}

function AvaliacaoIA({ animalId }: { animalId: string }) {
  const nav = useNav();
  const ultima = useCarga(async () => {
    const { data } = await supabase.from("dieta_avaliacoes").select("texto,created_at").eq("animal_id", animalId).order("created_at", { ascending: false }).limit(1);
    const a = data?.[0];
    return a ? { av: JSON.parse(a.texto) as Avaliacao, quando: a.created_at as string } : null;
  }, [animalId]);
  const [aberto, setAberto] = useState(false);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [objetivo, setObjetivo] = useState<string | null>("manter");
  const [condicoes, setCondicoes] = useState<string[]>([]);
  const [obs, setObs] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [res, setRes] = useState<{ av: Avaliacao; quando: string } | null>(null);
  const atual = res ?? ultima.dados;

  async function avaliar() {
    if (ocupado) return;
    setErro(null); setOcupado(true);
    const { data, erro: e } = await chamarFuncao<{ avaliacao: Avaliacao; created_at: string }>("avaliar-dieta", { animal_id: animalId, categoria, objetivo, condicoes, observacao: obs });
    setOcupado(false);
    if (e || !data?.avaliacao) return setErro(e ?? "Não foi possível avaliar agora.");
    setRes({ av: data.avaliacao, quando: data.created_at });
    setAberto(false);
  }

  return (
    <View>
      <Cabecalho texto="Avaliação com IA" />
      {!aberto ? (
        <Botao titulo={atual ? "Avaliar de novo com a IA" : "Avaliar a alimentação com a IA"} icone="robot-outline" tipo={atual ? "leve" : "secundario"} onPress={() => setAberto(true)} />
      ) : (
        <Cartao style={{ borderColor: cor.couro, borderWidth: 2 }}>
          <Escolha rotulo="O que ele faz?" valor={categoria} aoEscolher={setCategoria} opcoes={CATEGORIAS_IA} colunas={2} />
          <Escolha rotulo="Objetivo" valor={objetivo} aoEscolher={setObjetivo}
            opcoes={[{ valor: "manter", rotulo: "Manter o peso" }, { valor: "ganhar", rotulo: "Ganhar peso" }, { valor: "perder", rotulo: "Perder peso" }]} />
          <EscolhaVarias rotulo="Marque se for o caso" valores={condicoes} aoMudar={setCondicoes} opcoes={CONDICOES_IA} colunas={2} />
          <Campo rotulo="Algo mais? (opcional)" value={obs} onChangeText={setObs} multiline maxLength={400} placeholder="Ex.: a ração é de 12% de proteína" />
          <Aviso texto={erro} tipo="erro" />
          <Botao titulo="Avaliar agora" icone="robot-outline" tipo="secundario" onPress={avaliar} carregando={ocupado} />
          {ocupado && <Text style={[est.textoSuave, { marginTop: 6 }]}>A IA está olhando a alimentação… pode levar alguns segundos.</Text>}
          <Pressable onPress={() => setAberto(false)} style={{ minHeight: 48, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ color: cor.couro, fontSize: tam.texto, fontWeight: "700" }}>Cancelar</Text>
          </Pressable>
        </Cartao>
      )}
      {atual && !aberto && (
        <View style={{ marginTop: 10 }}>
          {atual.av.alerta ? <ListaIA titulo="Atenção" itens={[atual.av.alerta]} icone="alert-octagon-outline" fundo={cor.barroClaro} texto={cor.barro} /> : null}
          {atual.av.resumo ? <Text style={[est.texto, { fontWeight: "700", marginBottom: 8 }]}>{atual.av.resumo}</Text> : null}
          <ListaIA titulo="Parece bom" itens={atual.av.bom} icone="check-circle-outline" fundo={cor.mataClara} texto={cor.mata} />
          <ListaIA titulo="Pode estar sobrando" itens={atual.av.excessos} icone="arrow-up-circle-outline" fundo={cor.barroClaro} texto={cor.barro} />
          <ListaIA titulo="Pode estar faltando" itens={atual.av.faltas} icone="arrow-down-circle-outline" fundo={cor.ouroClaro} texto={cor.ouro} />
          <ListaIA titulo="Para conversar com o veterinário" itens={atual.av.ajustes} icone="stethoscope" fundo={cor.cartao} texto={cor.mata} />
          <ListaIA titulo="Falta saber" itens={atual.av.falta_saber} icone="help-circle-outline" fundo={cor.couroClaro} texto={cor.couro} />
          <Text style={[est.textoSuave, { marginBottom: 8 }]}>
            Avaliado em {br(atual.quando.slice(0, 10))}. Feito por inteligência artificial com base em referências de nutrição. Pode errar: confirme com o veterinário ou zootecnista antes de mudar a alimentação, sempre aos poucos.
          </Text>
          <Pressable onPress={() => nav.ir("MinhaIA")} style={{ minHeight: 44, justifyContent: "center" }}>
            <Text style={{ color: cor.couro, fontSize: tam.pequeno, fontWeight: "700" }}>Usar a minha própria IA →</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function Dieta({ animalId, nome }: { animalId: string; nome: string }) {
  const nav = useNav();
  const [form, setForm] = useState<any | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [pesoTxt, setPesoTxt] = useState("");

  const { dados, carregando, recarregar } = useCarga(async () => {
    const [itens, med] = await Promise.all([
      supabase.from("dieta_itens").select("*").eq("animal_id", animalId).eq("ativo", true).order("created_at"),
      supabase.from("records").select("data,peso_kg,medidas").eq("animal_id", animalId).eq("status", "realizado").not("peso_kg", "is", null).order("data", { ascending: false }).limit(1),
    ]);
    return { itens: itens.data ?? [], ultimoPeso: med.data?.[0] ?? null };
  }, [animalId]);

  useEffect(() => {
    if (dados?.ultimoPeso && !pesoTxt) setPesoTxt(String(dados.ultimoPeso.peso_kg).replace(".", ","));
  }, [dados]);

  if (carregando && !dados) return <Tela titulo="Alimentação" voltar><Carregando /></Tela>;

  const itens = (dados?.itens ?? []).map((i: any) => ({ ...i, quantidade: Number(i.quantidade), materia_seca_pct: i.materia_seca_pct != null ? Number(i.materia_seca_pct) : null }));
  const peso = lerNumero(pesoTxt);
  const pesoOk = peso && !Number.isNaN(peso) && peso > 30 ? peso : null;
  const r = calcularDieta(itens, pesoOk);
  const temSilagem = itens.some((i: any) => i.tipo === "silagem");
  const limiteRefeicao = pesoOk ? (pesoOk * REFERENCIAS.concentradoPorRefeicaoMax) / 100 : null;

  function novo() {
    setErro(null);
    setForm({ tipo: null, nome: "", quantidade: "", unidade: "kg", refeicoes: "2", ms: "" });
  }
  function editar(i: any) {
    setErro(null);
    setForm({ id: i.id, tipo: i.tipo, nome: i.nome, quantidade: String(i.quantidade).replace(".", ","), unidade: i.unidade, refeicoes: String(i.refeicoes), ms: i.materia_seca_pct != null ? String(i.materia_seca_pct).replace(".", ",") : "" });
  }

  async function salvarItem() {
    setErro(null);
    if (!form.tipo) return setErro("Escolha o tipo de alimento.");
    const q = lerNumero(form.quantidade);
    if (!q || Number.isNaN(q) || q <= 0) return setErro("Informe quanto ele come por dia.");
    const ms = lerNumero(form.ms);
    if (Number.isNaN(ms) || (ms != null && (ms <= 0 || ms > 100))) return setErro("Matéria seca deve ficar entre 1 e 100%.");
    setSalvando(true);
    const linha = {
      animal_id: animalId, tipo: form.tipo, nome: (form.nome || infoTipoDieta(form.tipo).rotulo).trim(),
      quantidade: q, unidade: form.unidade, refeicoes: Number(form.refeicoes) || 1, materia_seca_pct: ms,
    };
    const res = form.id
      ? await supabase.from("dieta_itens").update(linha).eq("id", form.id)
      : await supabase.from("dieta_itens").insert(linha);
    setSalvando(false);
    if (res.error) return setErro(mensagemErro(res.error));
    setForm(null);
    recarregar();
  }

  async function removerItem(id: string) {
    const { error } = await supabase.from("dieta_itens").update({ ativo: false }).eq("id", id);
    if (error) return setErro(mensagemErro(error));
    setForm(null);
    recarregar();
  }

  return (
    <Tela titulo="Alimentação" voltar subtitulo={nome}>
      <Campo rotulo="Peso do animal (kg)" value={pesoTxt} onChangeText={setPesoTxt} keyboardType="decimal-pad"
        dica={dados?.ultimoPeso ? `Último peso anotado: ${numBR(Number(dados.ultimoPeso.peso_kg))} kg em ${br(dados.ultimoPeso.data)}${dados.ultimoPeso.medidas?.peso_estimado_fita ? " (estimado pela fita)" : ""}.` : "Sem peso anotado. Use Anotar → Peso e corpo (dá para medir com fita), ou digite aqui."} />

      <Cabecalho texto="O que ele come por dia" />
      {itens.length === 0 && !form ? <Vazio texto="Nenhum alimento anotado." /> : itens.map((i: any) => (
        <Cartao key={i.id} onPress={() => editar(i)}>
          <View style={est.entre}>
            <Text style={[est.texto, { fontWeight: "700", flex: 1 }]}>{i.nome}</Text>
            <Text style={[est.texto, { fontWeight: "700" }]}>{numBR(i.quantidade, 3)} {i.unidade}</Text>
          </View>
          <Text style={est.textoSuave}>{infoTipoDieta(i.tipo).rotulo} · {i.refeicoes}x por dia</Text>
        </Cartao>
      ))}

      {form ? (
        <Cartao style={{ borderColor: cor.mata, borderWidth: 2 }}>
          <Text style={[est.texto, { fontWeight: "700", marginBottom: 8 }]}>{form.id ? "Mudar alimento" : "Novo alimento"}</Text>
          <Escolha rotulo="Tipo" valor={form.tipo} aoEscolher={(v) => setForm({ ...form, tipo: v, unidade: v === "sal_mineral" || v === "sal_comum" ? "g" : "kg" })} opcoes={TIPOS_DIETA} colunas={2} />
          <Campo rotulo="Nome ou marca (se quiser)" value={form.nome} onChangeText={(t) => setForm({ ...form, nome: t })} placeholder="Ex.: Ração Potro 12%" />
          <Escolha rotulo={`Quanto por dia (${form.unidade === "g" ? "gramas" : "kg"})`} valor={QTD[form.unidade === "g" ? "g" : "kg"].includes(form.quantidade) ? form.quantidade : null}
            aoEscolher={(v) => v && setForm({ ...form, quantidade: v })}
            opcoes={QTD[form.unidade === "g" ? "g" : "kg"].map((n) => ({ valor: n, rotulo: n }))} />
          <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Campo rotulo="Outra quantidade" value={form.quantidade} onChangeText={(t) => setForm({ ...form, quantidade: t })} keyboardType="decimal-pad" />
            </View>
            <View style={{ width: 150 }}>
              <Escolha rotulo="Medida" valor={form.unidade} aoEscolher={(v) => setForm({ ...form, unidade: v ?? "kg" })}
                opcoes={[{ valor: "kg", rotulo: "kg" }, { valor: "g", rotulo: "gramas" }]} />
            </View>
          </View>
          <Escolha rotulo="Quantas vezes ao dia" valor={form.refeicoes} aoEscolher={(v) => setForm({ ...form, refeicoes: v ?? "1" })}
            opcoes={["1", "2", "3", "4"].map((n) => ({ valor: n, rotulo: `${n}x` }))} />
          <Campo rotulo="Matéria seca % (opcional)" value={form.ms} onChangeText={(t) => setForm({ ...form, ms: t })} keyboardType="decimal-pad"
            dica={form.tipo ? `Se deixar em branco, o app usa ${infoTipoDieta(form.tipo).ms ?? "—"}%. Na ração, é 100 menos a "umidade" escrita no saco.` : undefined} />
          <Aviso texto={erro} tipo="erro" />
          <Botao titulo="Guardar alimento" icone="check" onPress={salvarItem} carregando={salvando} />
          {form.id && <BotaoConfirmar titulo="Tirar da dieta" onConfirmar={() => removerItem(form.id)} />}
          <Pressable onPress={() => setForm(null)} style={{ minHeight: 48, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ color: cor.couro, fontSize: tam.texto, fontWeight: "700" }}>Cancelar</Text>
          </Pressable>
        </Cartao>
      ) : (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Botao titulo="Alimento" icone="plus-circle" style={{ flex: 1 }} onPress={novo} />
          <Botao titulo="Horários" icone="bell-plus-outline" tipo="leve" style={{ flex: 1 }} onPress={() => nav.ir("NovoLembrete")} />
        </View>
      )}

      {itens.length > 0 && !form && <AvaliacaoIA animalId={animalId} />}

      {itens.length > 0 && (
        <>
          <Cabecalho texto="Está bom? (conta do app)" />
          <Text style={[est.textoSuave, { marginBottom: 10 }]}>
            Total no cocho: {numBR(r.naturalKg, 2)} kg por dia. O cálculo só compara com referências para cavalo adulto em descanso ou trabalho leve.
          </Text>
          <Resultado titulo="Comida seca total (matéria seca)" situacao={r.situacaoMs}
            valor={`${numBR(r.msKg, 2)} kg/dia${r.msPctPV != null ? ` = ${numBR(r.msPctPV, 2)}% do peso` : ""}`}
            referencia={`Referência usual: ${numBR(REFERENCIAS.msTotalUsual[0])} a ${numBR(REFERENCIAS.msTotalUsual[1])}% do peso por dia. Nunca abaixo de ${numBR(REFERENCIAS.msTotalMin, 2)}%.${r.msPctPV != null && r.msPctPV < REFERENCIAS.msTotalMin ? " Atenção: está abaixo do mínimo." : ""}`} />
          <Resultado titulo="Volumoso (feno, capim, silagem)" situacao={r.situacaoVolumoso}
            valor={`${numBR(r.volumosoMsKg, 2)} kg/dia${r.volumosoPctPV != null ? ` = ${numBR(r.volumosoPctPV, 2)}% do peso` : ""}${r.volumosoParteDieta != null ? ` · ${numBR(r.volumosoParteDieta, 0)}% da dieta` : ""}`}
            referencia={`Referência: pelo menos ${numBR(REFERENCIAS.volumosoMin)}% do peso em matéria seca, e pelo menos metade da dieta.`} />
          {r.concentradoKgDia > 0 && (
            <Resultado titulo="Maior refeição de ração ou grão" situacao={r.situacaoRefeicao}
              valor={`${numBR(r.concentradoMaiorRefeicaoKg, 2)} kg${r.refeicaoPctPV != null ? ` = ${numBR(r.refeicaoPctPV, 2)}% do peso` : ""}`}
              referencia={`Conta considerando que a ração e os grãos vão juntos no cocho. Referência: até ${numBR(REFERENCIAS.concentradoPorRefeicaoMax)}% do peso por refeição${limiteRefeicao ? ` (cerca de ${numBR(limiteRefeicao, 1)} kg para este animal)` : ""}. Mais que isso pode causar cólica e laminite.`} />
          )}
          <Cartao>
            <Text style={[est.texto, { fontWeight: "700" }]}>Sal e minerais</Text>
            <Text style={est.texto}>Sal comum: {numBR(r.salComumG, 0)} g por dia.</Text>
            <Text style={est.textoSuave}>Referência de sal comum: cerca de {REFERENCIAS.salGramasDia[0]} a {REFERENCIAS.salGramasDia[1]} g por dia para um cavalo de 500 kg em descanso; mais quando sua.</Text>
            <Text style={[est.texto, { marginTop: 6 }]}>Sal mineral: {numBR(r.salMineralG, 0)} g por dia.</Text>
            <Text style={est.textoSuave}>{CUIDADOS.minerais}</Text>
          </Cartao>
          <Cartao>
            <Text style={[est.texto, { fontWeight: "700" }]}>Água</Text>
            <Text style={est.texto}>{r.aguaLitros ? `Cerca de ${r.aguaLitros[0]} a ${r.aguaLitros[1]} litros por dia, ou mais.` : "Informe o peso para ver a estimativa."}</Text>
            <Text style={est.textoSuave}>{CUIDADOS.agua}</Text>
          </Cartao>
          {r.msSemDado.length > 0 && <Aviso texto={`Sem matéria seca para: ${r.msSemDado.join(", ")}. Informe o valor para o cálculo ficar completo.`} />}
          <Cartao style={{ backgroundColor: cor.couroClaro }}>
            <Text style={[est.texto, { fontWeight: "700" }]}>Cuidados</Text>
            <Text style={est.texto}>• {CUIDADOS.mudanca}</Text>
            <Text style={est.texto}>• {CUIDADOS.mofo}</Text>
            {temSilagem && <Text style={est.texto}>• {CUIDADOS.silagem}</Text>}
            <Text style={[est.textoSuave, { marginTop: 8 }]}>Este cálculo não substitui o veterinário ou o zootecnista. Para montar ou mudar a dieta, converse com eles.</Text>
          </Cartao>
          <Text style={[est.textoSuave, { fontSize: tam.mini }]}>Fontes: {REFERENCIAS.fontes.join(" · ")}</Text>
        </>
      )}
    </Tela>
  );
}
