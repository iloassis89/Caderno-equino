import React from "react";
import { Text, View } from "react-native";
import { supabase } from "../supabase";
import { useCarga } from "../dados";
import { Botao, Cabecalho, Carregando, Cartao, Icone, Tela, Vazio, useNav, usePlano } from "../ui";
import { NOME_APP, reais } from "../constantes";
import { br } from "../datas";
import { cor, est } from "../tema";

function ItemMenu({ t, i, d, onPress }: { t: string; i: string; d?: string; onPress: () => void }) {
  return (
    <Cartao onPress={onPress}>
      <View style={[est.linha, { gap: 12 }]}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: cor.mataClara, alignItems: "center", justifyContent: "center" }}>
          <Icone nome={i} tamanho={26} cor={cor.mata} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[est.texto, { fontWeight: "700" }]}>{t}</Text>
          {d ? <Text style={est.textoSuave}>{d}</Text> : null}
        </View>
        <Icone nome="chevron-right" tamanho={28} cor={cor.tintaSuave} />
      </View>
    </Cartao>
  );
}

export function Mais() {
  const nav = useNav();
  const { admin, pago } = usePlano();
  const { dados } = useCarga(async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data: af } = await supabase.from("affiliates").select("id").maybeSingle();
    return { email: u.user?.email, afiliado: !!af };
  });
  const itens = [
    { t: "Estoque", d: "Ração, feno, sal: compras e quanto falta", i: "package-variant-closed", r: "Estoque" },
    { t: "Todas as anotações", d: "Com filtros", i: "book-open-variant", r: "Historico" },
    ...(pago ? [{ t: "Resumo da semana", i: "file-chart-outline", r: "Resumo" }] : []),
    { t: "Minha IA", d: "Use a sua conta de IA (Gemini, ChatGPT ou Claude)", i: "robot-outline", r: "MinhaIA" },
    { t: "Ajuda", d: "Pergunte à IA, dicas, como usar, falar com a gente", i: "lifebuoy", r: "Ajuda" },
    { t: "Meu plano", i: "star-outline", r: "Planos" },
    ...(dados?.afiliado ? [{ t: "Painel do parceiro", i: "handshake-outline", r: "Afiliado" }] : []),
    ...(admin ? [{ t: "Administração", i: "shield-account-outline", r: "Admin" }] : []),
  ];
  return (
    <Tela titulo="Mais" subtitulo={dados?.email ?? undefined}>
      {itens.map((i) => <ItemMenu key={i.r} t={i.t} d={(i as any).d} i={i.i} onPress={() => nav.ir(i.r)} />)}
      <Botao titulo="Sair" tipo="leve" icone="logout" onPress={() => supabase.auth.signOut()} />
      <Text style={[est.textoSuave, { marginTop: 20 }]}>
        O {NOME_APP} registra e organiza informações. Ele não faz diagnóstico, não indica remédio e não substitui o médico-veterinário.
      </Text>
    </Tela>
  );
}

export function Ajuda() {
  const nav = useNav();
  return (
    <Tela titulo="Ajuda" voltar>
      <ItemMenu t="Pergunte à IA" d="Dúvida rápida e respostas guardadas" i="chat-question-outline" onPress={() => nav.ir("Assistente")} />
      <ItemMenu t="Dicas" i="lightbulb-on-outline" onPress={() => nav.ir("Dicas")} />
      <ItemMenu t="Como usar o app" i="school-outline" onPress={() => nav.ir("Tutorial")} />
      <ItemMenu t="Falar com a gente" d="Suporte, anúncios, sugestões" i="lifebuoy" onPress={() => nav.ir("Suporte")} />
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
