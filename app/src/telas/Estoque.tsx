import React, { useState } from "react";
import { Text, View } from "react-native";
import { supabase, mensagemErro } from "../supabase";
import { carregarAnimais, carregarPlano, useCarga } from "../dados";
import { Aviso, Botao, Cabecalho, Campo, Carregando, Cartao, Escolha, Tela, Vazio, useNav } from "../ui";
import { MOVIMENTOS, TIPOS_ESTOQUE, reais, rotuloDe } from "../constantes";
import { br, hojeISO, mascaraData, paraISO } from "../datas";
import { cor, est } from "../tema";

const qtd = (n: any) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 3 });

export function Estoque() {
  const nav = useNav();
  const { dados, carregando } = useCarga(async () => {
    const [plano, saldos, movs] = await Promise.all([
      carregarPlano(),
      supabase.from("stock_balance").select("*").order("nome"),
      supabase.from("stock_movements").select("*, stock_items(nome,unidade)").order("data", { ascending: false }).limit(30),
    ]);
    return { plano, saldos: saldos.data ?? [], movs: movs.data ?? [] };
  });
  if (carregando && !dados) return <Tela titulo="Estoque e compras"><Carregando /></Tela>;
  const { plano, saldos, movs } = dados!;
  const liberado = !!plano?.permite_estoque;
  const totalGasto = saldos.reduce((s: number, i: any) => s + Number(i.custo_realizado_centavos ?? 0), 0);
  const totalPlanejado = saldos.reduce((s: number, i: any) => s + Number(i.custo_planejado_centavos ?? 0), 0);

  return (
    <Tela titulo="Estoque e compras" subtitulo="Ração, silagem, volumoso e suplementos: o que tem, o que foi comprado, o que está planejado e o que foi usado.">
      {!liberado && (
        <Cartao style={{ backgroundColor: cor.couroClaro }}>
          <Text style={est.texto}>O controle de estoque e custos faz parte dos planos pagos, a partir de R$ 9,90 por mês.</Text>
          <Botao titulo="Ver planos" tipo="secundario" onPress={() => nav.ir("Planos")} />
        </Cartao>
      )}
      {liberado && (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Botao titulo="+ Item" style={{ flex: 1 }} onPress={() => nav.ir("NovoItem")} />
          <Botao titulo="+ Movimento" tipo="secundario" style={{ flex: 1 }} onPress={() => nav.ir("NovoMovimento")} desativado={saldos.length === 0} />
        </View>
      )}

      <Cabecalho texto="Saldos" />
      {saldos.length === 0 ? <Vazio texto="Nenhum item cadastrado." /> : saldos.map((i: any) => (
        <Cartao key={i.item_id} onPress={liberado ? () => nav.ir("NovoMovimento", { itemId: i.item_id }) : undefined}>
          <View style={est.entre}>
            <Text style={[est.texto, { fontWeight: "700", flex: 1 }]}>{i.nome}</Text>
            <Text style={[est.texto, { fontWeight: "700", color: Number(i.saldo) <= 0 ? cor.barro : cor.mata }]}>
              {qtd(i.saldo)} {i.unidade}
            </Text>
          </View>
          <Text style={est.textoSuave}>
            {rotuloDe(TIPOS_ESTOQUE, i.tipo)} · gasto {reais(i.custo_realizado_centavos)}
            {Number(i.planejado) > 0 ? ` · planejado ${qtd(i.planejado)} ${i.unidade} (${reais(i.custo_planejado_centavos)})` : ""}
          </Text>
        </Cartao>
      ))}
      {saldos.length > 0 && (
        <Text style={[est.texto, { marginTop: 4 }]}>Total gasto: <Text style={{ fontWeight: "700" }}>{reais(totalGasto)}</Text> · Planejado: {reais(totalPlanejado)}</Text>
      )}

      <Cabecalho texto="Últimos movimentos" />
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

export function NovoItem() {
  const nav = useNav();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<string | null>(null);
  const [unidade, setUnidade] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  async function salvar() {
    setErro(null);
    if (!nome.trim() || !tipo || !unidade.trim()) return setErro("Preencha nome, tipo e unidade.");
    setSalvando(true);
    const { error } = await supabase.from("stock_items").insert({ nome: nome.trim(), tipo, unidade: unidade.trim() });
    setSalvando(false);
    if (error) return setErro(mensagemErro(error));
    nav.voltar();
  }
  return (
    <Tela titulo="Novo item de estoque" voltar>
      <Campo rotulo="Nome *" value={nome} onChangeText={setNome} placeholder="Ex.: Silagem de milho" />
      <Escolha rotulo="Tipo *" valor={tipo} aoEscolher={setTipo} opcoes={TIPOS_ESTOQUE} />
      <Campo rotulo="Unidade *" value={unidade} onChangeText={setUnidade} placeholder="Ex.: saco 20 kg, kg, fardo" />
      <Aviso texto={erro} tipo="erro" />
      <Botao titulo="Salvar" onPress={salvar} carregando={salvando} />
    </Tela>
  );
}

export function NovoMovimento({ itemId }: { itemId?: string }) {
  const nav = useNav();
  const itens = useCarga(async () => (await supabase.from("stock_items").select("*").eq("ativo", true).order("nome")).data ?? []);
  const animais = useCarga(() => carregarAnimais(true));
  const [item, setItem] = useState<string | null>(itemId ?? null);
  const [tipo, setTipo] = useState<string | null>(null);
  const [data, setData] = useState(br(hojeISO()));
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
    const dataISO = paraISO(data);
    if (!dataISO) return setErro("Data inválida.");
    const q = Number(quantidade.replace(",", "."));
    if (!Number.isFinite(q) || (tipo !== "ajuste" && q <= 0) || q === 0) return setErro("Quantidade inválida.");
    let custoCent: number | null = null;
    if (custo.trim()) {
      const c = Number(custo.replace(/\./g, "").replace(",", "."));
      if (!Number.isFinite(c) || c < 0) return setErro("Valor inválido.");
      custoCent = Math.round(c * 100);
    }
    setSalvando(true);
    const { error } = await supabase.from("stock_movements").insert({
      item_id: item, tipo, data: dataISO, quantidade: q, custo_total_centavos: custoCent,
      animal_id: tipo === "consumo" ? animal : null, observacao: obs.trim() || null,
    });
    setSalvando(false);
    if (error) return setErro(mensagemErro(error));
    nav.voltar();
  }

  return (
    <Tela titulo="Movimento de estoque" voltar subtitulo="Compra planejada não altera o saldo; só a compra feita e o consumo alteram.">
      <Escolha rotulo="Item *" valor={item} aoEscolher={setItem} opcoes={(itens.dados ?? []).map((i: any) => ({ valor: i.id, rotulo: i.nome }))} />
      <Escolha rotulo="Tipo *" valor={tipo} aoEscolher={setTipo} opcoes={MOVIMENTOS} />
      <Campo rotulo="Data *" value={data} onChangeText={(t) => setData(mascaraData(t))} keyboardType="number-pad" />
      <Campo rotulo={`Quantidade${unidade ? ` (${unidade})` : ""} *`} value={quantidade} onChangeText={setQuantidade} keyboardType="decimal-pad"
        dica={tipo === "ajuste" ? "Use número negativo para reduzir o saldo." : undefined} />
      {(tipo === "compra_planejada" || tipo === "compra_realizada") && (
        <Campo rotulo="Valor total (R$)" value={custo} onChangeText={setCusto} keyboardType="decimal-pad" placeholder="Ex.: 240,00" />
      )}
      {tipo === "consumo" && (
        <Escolha rotulo="Animal (opcional)" permitirVazio valor={animal} aoEscolher={setAnimal}
          opcoes={(animais.dados ?? []).map((a: any) => ({ valor: a.id, rotulo: a.nome }))} />
      )}
      <Campo rotulo="Observação" value={obs} onChangeText={setObs} placeholder="Fornecedor, nota fiscal…" />
      <Aviso texto={erro} tipo="erro" />
      <Botao titulo="Salvar" onPress={salvar} carregando={salvando} />
    </Tela>
  );
}
