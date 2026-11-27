import React, { useState } from "react";
import { Text, View } from "react-native";
import { supabase, mensagemErro } from "../supabase";
import { carregarAnimais, carregarPlano, useCarga } from "../dados";
import { Aviso, Botao, Cabecalho, Campo, Carregando, Cartao, Escolha, Tela, Vazio, useNav, usePlano } from "../ui";
import { MOVIMENTOS, TIPOS_ESTOQUE, lerNumero, reais, rotuloDe } from "../constantes";
import { br, hojeISO, mascaraData, paraISO, somarDias } from "../datas";
import { cor, est } from "../tema";

const qtd = (n: any) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 3 });

export function Estoque() {
  const nav = useNav();
  const { pago } = usePlano();
  const { dados, carregando } = useCarga(async () => {
    const [plano, saldos, movs, prev] = await Promise.all([
      carregarPlano(),
      supabase.from("stock_balance").select("*").order("nome"),
      supabase.from("stock_movements").select("*, stock_items(nome,unidade)").order("data", { ascending: false }).limit(30),
      supabase.rpc("previsao_estoque"),
    ]);
    const previsao = new Map(((prev.data ?? []) as any[]).map((p) => [p.item_id, p]));
    return { plano, saldos: saldos.data ?? [], movs: movs.data ?? [], previsao };
  });
  if (carregando && !dados) return <Tela titulo="Estoque e compras" voltar><Carregando /></Tela>;
  const { saldos, movs, previsao } = dados!;
  const liberado = pago;
  const totalGasto = saldos.reduce((s: number, i: any) => s + Number(i.custo_realizado_centavos ?? 0), 0);
  const totalPlanejado = saldos.reduce((s: number, i: any) => s + Number(i.custo_planejado_centavos ?? 0), 0);

  return (
    <Tela titulo="Estoque" voltar>
      {!liberado && (
        <Cartao style={{ backgroundColor: cor.couroClaro }}>
          <Text style={est.texto}>Estoque, gastos e aviso de “comprar de novo”: no plano pago (R$ 9,90/mês).</Text>
          <Botao titulo="Conhecer o plano" tipo="leve" onPress={() => nav.ir("Planos")} />
        </Cartao>
      )}
      {liberado && (
        <Botao titulo="Novo item" icone="plus-circle" tipo="leve" onPress={() => nav.ir("NovoItem")} />
      )}

      <Cabecalho texto="Quanto tem" />
      {saldos.length === 0 ? <Vazio texto="Nenhum item ainda. Toque em Novo item (ex.: ração, feno, sal)." /> : saldos.map((i: any) => {
        const p = previsao.get(i.item_id);
        const pouco = p?.dias_restantes != null && p.dias_restantes <= 5;
        return (
          <Cartao key={i.item_id}>
            <View style={est.entre}>
              <Text style={[est.texto, { fontWeight: "700", flex: 1 }]}>{i.nome}</Text>
              <Text style={[est.texto, { fontWeight: "700", color: Number(i.saldo) <= 0 ? cor.barro : cor.mata }]}>
                {Number(i.saldo) <= 0 ? "Acabou" : `${qtd(i.saldo)} ${i.unidade}`}
              </Text>
            </View>
            <Text style={[est.textoSuave, pouco ? { color: cor.barro, fontWeight: "700" } : null]}>
              {p?.dias_restantes != null ? (p.dias_restantes <= 0 ? "Deve ter acabado" : `Dá para ~${p.dias_restantes} dia(s)`) : rotuloDe(TIPOS_ESTOQUE, i.tipo)}
              {Number(i.custo_realizado_centavos) > 0 ? ` · gasto ${reais(i.custo_realizado_centavos)}` : ""}
            </Text>
            {liberado && (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Botao titulo="+ Comprei" style={{ flex: 1 }} onPress={() => nav.ir("NovoMovimento", { itemId: i.item_id, tipo: "compra_realizada" })} />
                <Botao titulo="− Usei" tipo="leve" style={{ flex: 1 }} onPress={() => nav.ir("NovoMovimento", { itemId: i.item_id, tipo: "consumo" })} />
              </View>
            )}
          </Cartao>
        );
      })}
      {liberado && saldos.length > 0 && <Botao titulo="Vou comprar / acertar estoque" tipo="leve" icone="swap-vertical" onPress={() => nav.ir("NovoMovimento")} />}
      {liberado && saldos.length > 0 && <Text style={[est.textoSuave, { marginTop: 6 }]}>Ligue a ração na Alimentação do animal e o app desconta o consumo sozinho para prever quando acaba. O aviso de “comprar de novo” fica na Agenda.</Text>}
      {saldos.length > 0 && (
        <Text style={[est.texto, { marginTop: 4 }]}>Gasto: <Text style={{ fontWeight: "700" }}>{reais(totalGasto)}</Text>{totalPlanejado > 0 ? ` · Vou comprar: ${reais(totalPlanejado)}` : ""}</Text>
      )}

      <Cabecalho texto="Últimas compras e usos" />
      {movs.length === 0 ? <Vazio texto="Nenhum movimento." /> : movs.map((m: any) => (
        <Cartao key={m.id}>
          <View style={est.entre}>
            <Text style={[est.texto, { flex: 1 }]}>{m.stock_items?.nome} · {rotuloDe(MOVIMENTOS, m.tipo)}</Text>
            <Text style={est.texto}>{qtd(m.quantidade)} {m.stock_items?.unidade}</Text>
          </View>
          <Text style={est.textoSuave}>{br(m.data)}{m.custo_total_centavos != null ? ` · ${reais(m.custo_total_centavos)}` : ""}{m.observacao ? ` · ${m.observacao}` : ""}</Text>
        </Cartao>
      ))}
    </Tela>
  );
}

const UNIDADES = ["Saco 20 kg", "Saco 25 kg", "Saco 30 kg", "Saco 40 kg", "Fardo", "kg", "Balde"];

export function NovoItem() {
  const nav = useNav();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<string | null>(null);
  const [unidade, setUnidade] = useState<string | null>(null);
  const [outraUnidade, setOutraUnidade] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  async function salvar() {
    setErro(null);
    const u = (outraUnidade.trim() || unidade || "").trim();
    const n = (nome.trim() || (tipo ? rotuloDe(TIPOS_ESTOQUE, tipo) : "")).trim();
    if (!tipo) return setErro("Escolha o que é.");
    if (!u) return setErro("Escolha como conta (saco, fardo, kg…).");
    setSalvando(true);
    const { error } = await supabase.from("stock_items").insert({ nome: n, tipo, unidade: u });
    setSalvando(false);
    if (error) return setErro(mensagemErro(error));
    nav.voltar();
  }
  return (
    <Tela titulo="Novo item" voltar>
      <Escolha rotulo="O que é?" valor={tipo} aoEscolher={setTipo} opcoes={TIPOS_ESTOQUE} colunas={2} />
      <Escolha rotulo="Como conta?" valor={unidade} aoEscolher={(v) => { setUnidade(v); setOutraUnidade(""); }} opcoes={UNIDADES.map((u) => ({ valor: u, rotulo: u }))} />
      <Campo rotulo="Outra medida (opcional)" value={outraUnidade} onChangeText={setOutraUnidade} />
      <Campo rotulo="Nome ou marca (opcional)" value={nome} onChangeText={setNome} placeholder="Ex.: Ração Potro 12%" />
      <Text style={[est.textoSuave, { marginBottom: 8 }]}>Dica: para o app prever quando acaba sozinho, use “kg” e ligue o item na Alimentação do animal.</Text>
      <Aviso texto={erro} tipo="erro" />
      <Botao titulo="Guardar" icone="check" onPress={salvar} carregando={salvando} />
    </Tela>
  );
}

export function NovoMovimento({ itemId, tipo: tipoInicial }: { itemId?: string; tipo?: string }) {
  const nav = useNav();
  const itens = useCarga(async () => (await supabase.from("stock_items").select("*").eq("ativo", true).order("nome")).data ?? []);
  const animais = useCarga(() => carregarAnimais(true));
  const [item, setItem] = useState<string | null>(itemId ?? null);
  const [tipo, setTipo] = useState<string | null>(tipoInicial ?? null);
  const [quando, setQuando] = useState<string | null>("hoje");
  const [data, setData] = useState(br(hojeISO()));
  const ultimoPreco = useCarga(async () => {
    if (!item) return null;
    const { data: m } = await supabase.from("stock_movements").select("quantidade,custo_total_centavos").eq("item_id", item).eq("tipo", "compra_realizada")
      .not("custo_total_centavos", "is", null).order("data", { ascending: false }).limit(1);
    const u = m?.[0];
    return u && Number(u.quantidade) > 0 ? Number(u.custo_total_centavos) / Number(u.quantidade) : null;
  }, [item]);
  const [quantidade, setQuantidade] = useState("");
  const [custo, setCusto] = useState("");
  const [animal, setAnimal] = useState<string | null>(null);
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const unidade = (itens.dados ?? []).find((i: any) => i.id === item)?.unidade ?? "";

  async function salvar() {
    setErro(null);
    if (!item || !tipo) return setErro("Escolha o item e o tipo de movimento.");
    const dataISO = quando === "hoje" ? hojeISO() : quando === "ontem" ? somarDias(hojeISO(), -1) : paraISO(data);
    if (!dataISO) return setErro("Data inválida.");
    const q = lerNumero(quantidade) as number;
    if (!Number.isFinite(q) || (tipo !== "ajuste" && q <= 0) || q === 0) return setErro("Quantidade inválida.");
    let custoCent: number | null = null;
    const custoTexto = custo.trim();
    if (custoTexto) {
      const c = lerNumero(custoTexto) as number;
      if (!Number.isFinite(c) || c < 0) return setErro("Valor inválido.");
      custoCent = Math.round(c * 100);
    }
    setSalvando(true);
    const { error } = await supabase.from("stock_movements").insert({
      item_id: item, tipo, data: dataISO, quantidade: q,
      custo_total_centavos: tipo === "compra_planejada" || tipo === "compra_realizada" ? custoCent : null,
      animal_id: tipo === "consumo" ? animal : null, observacao: obs.trim() || null,
    });
    setSalvando(false);
    if (error) return setErro(mensagemErro(error));
    nav.voltar();
  }

  return (
    <Tela titulo={tipo === "compra_realizada" ? "Comprei" : tipo === "consumo" ? "Usei" : "Estoque"} voltar>
      {!itemId && <Escolha rotulo="Qual item?" valor={item} aoEscolher={setItem} opcoes={(itens.dados ?? []).map((i: any) => ({ valor: i.id, rotulo: i.nome }))} />}
      {itemId && <Text style={[est.texto, { fontWeight: "700", marginBottom: 10 }]}>{(itens.dados ?? []).find((i: any) => i.id === itemId)?.nome ?? ""}</Text>}
      {!tipoInicial && <Escolha rotulo="O que foi?" valor={tipo} aoEscolher={setTipo} opcoes={MOVIMENTOS} colunas={2} />}
      <Escolha rotulo={`Quantos${unidade ? ` (${unidade})` : ""}?`} valor={["1", "2", "3", "5", "10"].includes(quantidade) ? quantidade : null}
        aoEscolher={(v) => v && setQuantidade(v)} opcoes={["1", "2", "3", "5", "10"].map((n) => ({ valor: n, rotulo: n }))} />
      <Campo rotulo="Outro número" value={quantidade} onChangeText={setQuantidade} keyboardType="decimal-pad"
        dica={tipo === "ajuste" ? "Use número negativo para reduzir o saldo." : undefined} />
      <Escolha rotulo="Quando?" valor={quando} aoEscolher={setQuando} opcoes={[{ valor: "hoje", rotulo: "Hoje" }, { valor: "ontem", rotulo: "Ontem" }, { valor: "outro", rotulo: "Outro dia" }]} />
      {quando === "outro" && <Campo rotulo="Dia" value={data} onChangeText={(t) => setData(mascaraData(t))} keyboardType="number-pad" placeholder="dia/mês/ano" />}
      {(tipo === "compra_planejada" || tipo === "compra_realizada") && (
        <Campo rotulo="Valor total (R$)" value={custo} onChangeText={setCusto} keyboardType="decimal-pad"
          placeholder="Ex.: 240,00" />
      )}
      {(tipo === "compra_planejada" || tipo === "compra_realizada") && !custo && ultimoPreco.dados && (lerNumero(quantidade) ?? 0) > 0 && (
        <Botao titulo={`Mesmo preço da última vez: ${reais(Math.round(ultimoPreco.dados * (lerNumero(quantidade) as number)))}`} tipo="leve"
          onPress={() => setCusto((ultimoPreco.dados! * (lerNumero(quantidade) as number) / 100).toFixed(2).replace(".", ","))} />
      )}
      {tipo === "consumo" && (
        <Escolha rotulo="Animal (opcional)" permitirVazio valor={animal} aoEscolher={setAnimal}
          opcoes={(animais.dados ?? []).map((a: any) => ({ valor: a.id, rotulo: a.nome }))} />
      )}
      <Campo rotulo="Observação (opcional)" value={obs} onChangeText={setObs} placeholder="Fornecedor, nota fiscal…" />
      <Aviso texto={erro} tipo="erro" />
      <Botao titulo="Guardar" icone="check" onPress={salvar} carregando={salvando} />
    </Tela>
  );
}
