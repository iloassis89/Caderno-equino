import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { supabase, mensagemErro } from "../supabase";
import { useCarga } from "../dados";
import { Aviso, Bloqueado, Botao, BotaoConfirmar, Cabecalho, Campo, Carregando, Cartao, Escolha, Icone, Tela, Vazio, usePlano } from "../ui";
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

export default function Dieta({ animalId, nome }: { animalId: string; nome: string }) {
  const { pago } = usePlano();
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

  if (!pago) {
    return (
      <Tela titulo="Alimentação" voltar subtitulo={nome}>
        <Bloqueado titulo="Dieta e cálculo da alimentação" texto="Anote o que o animal come por dia (ração, feno, capim, sal mineral…) e veja o cálculo comparado com referências. Disponível a partir de R$ 9,90 por mês." />
      </Tela>
    );
  }
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
    <Tela titulo="Alimentação" voltar subtitulo={`${nome} — o que come por dia`}>
      <Campo rotulo="Peso do animal (kg)" value={pesoTxt} onChangeText={setPesoTxt} keyboardType="decimal-pad"
        dica={dados?.ultimoPeso ? `Último peso anotado: ${numBR(Number(dados.ultimoPeso.peso_kg))} kg em ${br(dados.ultimoPeso.data)}${dados.ultimoPeso.medidas?.peso_estimado_fita ? " (estimado pela fita)" : ""}.` : "Sem peso anotado. Use Anotar → Peso e corpo (dá para medir com fita), ou digite aqui."} />

      <Cabecalho texto="O que ele come por dia" />
      {itens.length === 0 && !form ? <Vazio texto="Nenhum alimento anotado." /> : itens.map((i: any) => (
        <Cartao key={i.id} onPress={() => editar(i)}>
          <View style={est.entre}>
            <Text style={[est.texto, { fontWeight: "700", flex: 1 }]}>{i.nome}</Text>
            <Text style={[est.texto, { fontWeight: "700" }]}>{numBR(i.quantidade, 3)} {i.unidade}</Text>
          </View>
          <Text style={est.textoSuave}>{infoTipoDieta(i.tipo).rotulo} · {i.refeicoes} vez(es) ao dia · toque para mudar</Text>
        </Cartao>
      ))}

      {form ? (
        <Cartao style={{ borderColor: cor.mata, borderWidth: 2 }}>
          <Text style={[est.texto, { fontWeight: "700", marginBottom: 8 }]}>{form.id ? "Mudar alimento" : "Novo alimento"}</Text>
          <Escolha rotulo="Tipo" valor={form.tipo} aoEscolher={(v) => setForm({ ...form, tipo: v, unidade: v === "sal_mineral" || v === "sal_comum" ? "g" : "kg" })} opcoes={TIPOS_DIETA} colunas={2} />
          <Campo rotulo="Nome ou marca (se quiser)" value={form.nome} onChangeText={(t) => setForm({ ...form, nome: t })} placeholder="Ex.: Ração Potro 12%" />
          <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Campo rotulo="Quanto por dia" value={form.quantidade} onChangeText={(t) => setForm({ ...form, quantidade: t })} keyboardType="decimal-pad" />
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
      ) : <Botao titulo="Adicionar alimento" icone="plus-circle" onPress={novo} />}

      {itens.length > 0 && (
        <>
          <Cabecalho texto="Cálculo da dieta" />
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
          <Text style={[est.textoSuave, { fontSize: 13 }]}>Fontes: {REFERENCIAS.fontes.join(" · ")}</Text>
        </>
      )}
    </Tela>
  );
}
