import React from "react";
import { Text, View } from "react-native";
import { supabase } from "../supabase";
import { useCarga } from "../dados";
import { Botao, Cabecalho, Carregando, Cartao, Tela, Vazio, useNav } from "../ui";
import { reais } from "../constantes";
import { br } from "../datas";
import { cor, est } from "../tema";

export function Mais() {
  const nav = useNav();
  const { dados } = useCarga(async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data: af } = await supabase.from("affiliates").select("id").maybeSingle();
    return { email: u.user?.email, afiliado: !!af };
  });
  const itens = [
    { t: "Tarefas recorrentes", r: "Tarefas" },
    { t: "Resumo semanal", r: "Resumo" },
    { t: "Planos e assinatura", r: "Planos" },
    ...(dados?.afiliado ? [{ t: "Painel do parceiro (cupons e comissões)", r: "Afiliado" }] : []),
  ];
  return (
    <Tela titulo="Mais" subtitulo={dados?.email ?? undefined}>
      {itens.map((i) => (
        <Cartao key={i.r} onPress={() => nav.ir(i.r)}>
          <Text style={[est.texto, { fontSize: 17 }]}>{i.t}  ›</Text>
        </Cartao>
      ))}
      <Botao titulo="Sair da conta" tipo="leve" onPress={() => supabase.auth.signOut()} />
      <Text style={[est.textoSuave, { marginTop: 20 }]}>
        O Caderno Equino registra e organiza informações. Ele não faz diagnóstico, não recomenda medicamentos e não substitui o médico-veterinário.
      </Text>
    </Tela>
  );
}

export function Afiliado() {
  const { dados, carregando } = useCarga(async () => {
    const [af, cupons, vinculos, comissoes] = await Promise.all([
      supabase.from("affiliates").select("*").maybeSingle(),
      supabase.from("coupons").select("*").order("created_at"),
      supabase.from("referrals").select("customer_id", { count: "exact", head: true }),
      supabase.from("commissions").select("*").order("competencia", { ascending: false }).limit(200),
    ]);
    return { af: af.data, cupons: cupons.data ?? [], clientes: vinculos.count ?? 0, comissoes: comissoes.data ?? [] };
  });
  if (carregando && !dados) return <Tela titulo="Painel do parceiro" voltar><Carregando /></Tela>;
  const { af, cupons, clientes, comissoes } = dados!;
  if (!af) return <Tela titulo="Painel do parceiro" voltar><Vazio texto="Sua conta não está cadastrada como parceiro." /></Tela>;
  const soma = (st: string[]) => comissoes.filter((c: any) => st.includes(c.status)).reduce((s: number, c: any) => s + c.comissao_centavos, 0);

  return (
    <Tela titulo="Painel do parceiro" voltar subtitulo={af.nome}>
      <Cartao>
        <Text style={est.texto}>Clientes vinculados: <Text style={{ fontWeight: "700" }}>{clientes}</Text></Text>
        <Text style={est.texto}>A receber: <Text style={{ fontWeight: "700", color: cor.mata }}>{reais(soma(["pendente", "aprovada"]))}</Text></Text>
        <Text style={est.texto}>Já pago: <Text style={{ fontWeight: "700" }}>{reais(soma(["paga"]))}</Text></Text>
      </Cartao>
      <Text style={est.textoSuave}>
        Sua comissão é de 50% da receita líquida de cada mensalidade, menos o desconto que você oferece no cupom. Vale enquanto o cliente continuar pagando.
      </Text>
      <Cabecalho texto="Seus cupons" />
      {cupons.length === 0 ? <Vazio texto="Nenhum cupom." /> : cupons.map((c: any) => (
        <Cartao key={c.code}>
          <View style={est.entre}>
            <Text style={[est.texto, { fontWeight: "700", fontSize: 18 }]}>{c.code}</Text>
            <Text style={est.texto}>{c.desconto_pct}% para o cliente</Text>
          </View>
          <Text style={est.textoSuave}>{c.ativo ? "Ativo" : "Inativo"} · sua parte: {50 - c.desconto_pct}% do preço cheio líquido</Text>
        </Cartao>
      ))}
      <Cabecalho texto="Comissões" />
      {comissoes.length === 0 ? <Vazio texto="Nenhuma comissão ainda." /> : comissoes.map((c: any) => (
        <View key={c.id} style={[est.entre, { paddingVertical: 6, borderBottomWidth: 1, borderColor: cor.linha }]}>
          <Text style={est.texto}>{br(c.competencia)}</Text>
          <Text style={est.textoSuave}>{c.status}</Text>
          <Text style={[est.texto, { fontWeight: "700" }]}>{reais(c.comissao_centavos)}</Text>
        </View>
      ))}
    </Tela>
  );
}
