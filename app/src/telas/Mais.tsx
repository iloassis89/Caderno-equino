import React from "react";
import { Text, View } from "react-native";
import { supabase } from "../supabase";
import { useCarga } from "../dados";
import { Botao, Cabecalho, Carregando, Cartao, Icone, Tela, Vazio, useNav, usePlano } from "../ui";
import { NOME_APP, reais } from "../constantes";
import { br } from "../datas";
import { cor, est } from "../tema";

export function Mais() {
  const nav = useNav();
  const { admin } = usePlano();
  const { dados } = useCarga(async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data: af } = await supabase.from("affiliates").select("id").maybeSingle();
    return { email: u.user?.email, afiliado: !!af };
  });
  const itens = [
    { t: "Estoque e compras", i: "package-variant-closed", r: "Estoque" },
    { t: "Tarefas", i: "calendar-check", r: "Tarefas" },
    { t: "Resumo da semana", i: "file-chart-outline", r: "Resumo" },
    { t: "Dicas", i: "lightbulb-on-outline", r: "Dicas" },
    { t: "Perguntar ao assistente", i: "chat-question-outline", r: "Assistente" },
    { t: "Como usar o app", i: "school-outline", r: "Tutorial" },
    { t: "Planos e assinatura", i: "star-outline", r: "Planos" },
    ...(dados?.afiliado ? [{ t: "Painel do parceiro", i: "handshake-outline", r: "Afiliado" }] : []),
    ...(admin ? [{ t: "Administração", i: "shield-account-outline", r: "Admin" }] : []),
  ];
  return (
    <Tela titulo="Mais" subtitulo={dados?.email ?? undefined}>
      {itens.map((i) => (
        <Cartao key={i.r} onPress={() => nav.ir(i.r)}>
          <View style={[est.linha, { gap: 12 }]}>
            <Icone nome={i.i} tamanho={30} cor={cor.mata} />
            <Text style={[est.texto, { flex: 1, fontWeight: "700" }]}>{i.t}</Text>
            <Icone nome="chevron-right" tamanho={28} cor={cor.tintaSuave} />
          </View>
        </Cartao>
      ))}
      <Botao titulo="Sair da conta" tipo="leve" icone="logout" onPress={() => supabase.auth.signOut()} />
      <Text style={[est.textoSuave, { marginTop: 20 }]}>
        O {NOME_APP} registra e organiza informações. Ele não faz diagnóstico, não indica remédio e não substitui o médico-veterinário.
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
  const nomeStatus: Record<string, string> = { pendente: "A receber", aprovada: "A receber", paga: "Paga", estornada: "Cancelada (reembolso)" };

  return (
    <Tela titulo="Painel do parceiro" voltar subtitulo={af.nome}>
      <Cartao>
        <Text style={est.texto}>Clientes com seu cupom: <Text style={{ fontWeight: "700" }}>{clientes}</Text></Text>
        <Text style={est.texto}>A receber: <Text style={{ fontWeight: "700", color: cor.mata }}>{reais(soma(["pendente", "aprovada"]))}</Text></Text>
        <Text style={est.texto}>Já recebido: <Text style={{ fontWeight: "700" }}>{reais(soma(["paga"]))}</Text></Text>
      </Cartao>
      <Text style={est.textoSuave}>
        Você recebe 50% do valor líquido de cada mensalidade, menos o desconto que dá no cupom. Vale enquanto o cliente continuar pagando.
      </Text>
      <Cabecalho texto="Seus cupons" />
      {cupons.length === 0 ? <Vazio texto="Nenhum cupom." /> : cupons.map((c: any) => (
        <Cartao key={c.code}>
          <View style={est.entre}>
            <Text style={[est.texto, { fontWeight: "700", fontSize: 22 }]}>{c.code}</Text>
            <Text style={est.texto}>{c.desconto_pct}% de desconto</Text>
          </View>
          <Text style={est.textoSuave}>{c.ativo ? "Ativo" : "Inativo"}</Text>
        </Cartao>
      ))}
      <Cabecalho texto="Comissões" />
      {comissoes.length === 0 ? <Vazio texto="Nenhuma comissão ainda." /> : comissoes.map((c: any) => (
        <View key={c.id} style={[est.entre, { paddingVertical: 8, borderBottomWidth: 1, borderColor: cor.linha }]}>
          <Text style={est.texto}>{br(c.competencia)}</Text>
          <Text style={est.textoSuave}>{nomeStatus[c.status] ?? c.status}</Text>
          <Text style={[est.texto, { fontWeight: "700" }]}>{reais(c.comissao_centavos)}</Text>
        </View>
      ))}
    </Tela>
  );
}
