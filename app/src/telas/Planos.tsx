import React, { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { chamarFuncao, supabase, mensagemErro } from "../supabase";
import { carregarPlano, useCarga } from "../dados";
import { Aviso, Botao, Cabecalho, Campo, Carregando, Cartao, Escolha, Tela, usePlano } from "../ui";
import { reais } from "../constantes";
import { br } from "../datas";
import { cor, est } from "../tema";

function destinoRetorno() {
  if (Platform.OS === "web") {
    // @ts-ignore
    return `${window.location.origin}${window.location.pathname}`;
  }
  return Linking.createURL("assinatura");
}

async function abrir(url: string, destino: string) {
  if (Platform.OS === "web") {
    // @ts-ignore
    window.location.href = url;
    return;
  }
  await WebBrowser.openAuthSessionAsync(url, destino);
}

const PERIODOS = [{ valor: "1", rotulo: "1 mês" }, { valor: "3", rotulo: "3 meses" }, { valor: "6", rotulo: "6 meses" }, { valor: "12", rotulo: "1 ano" }];

export default function Planos({ retorno, pagamento }: { retorno?: string; pagamento?: { id: string; slug?: string; transaction_nsu?: string } }) {
  const [periodo, setPeriodo] = useState<string | null>("12");
  const [aguardando, setAguardando] = useState<string | null>(null);
  const [cupom, setCupom] = useState("");
  const [msg, setMsg] = useState<{ t: string; tipo: "erro" | "ok" | "info" } | null>(
    retorno === "sucesso" ? { t: "Pagamento recebido. Seu plano é atualizado em alguns segundos.", tipo: "ok" }
      : retorno === "cancelado" ? { t: "Pagamento não concluído. Nada foi cobrado.", tipo: "info" } : null,
  );
  const [ocupado, setOcupado] = useState<string | null>(null);
  const planoCtx = usePlano();

  const { dados, carregando, recarregar } = useCarga(async () => {
    const { data: u } = await supabase.auth.getUser();
    const [planos, atual, assinatura, vinculo, periodos] = await Promise.all([
      supabase.from("plans").select("*").order("ordem"),
      carregarPlano(),
      supabase.from("subscriptions").select("*").in("status", ["ativa", "em_atraso"]).order("created_at", { ascending: false }),
      supabase.from("referrals").select("desconto_pct, coupon_code").eq("customer_id", u.user?.id ?? "").maybeSingle(),
      supabase.from("planos_periodos").select("*"),
    ]);
    const agora = new Date().toISOString();
    const validas = (assinatura.data ?? []).filter((x: any) => !x.periodo_fim || x.periodo_fim > agora);
    const escolhida = validas.find((x: any) => x.fonte === "stripe") ?? validas[0] ?? null;
    const precos: Record<string, number> = {};
    for (const x of (periodos.data ?? []) as any[]) precos[`${x.plan_code}|${x.meses}`] = x.preco_centavos;
    return { planos: planos.data ?? [], atual, assinatura: escolhida, vinculo: vinculo.data, precos };
  });

  async function aplicarCupom() {
    setMsg(null);
    if (!cupom.trim()) return;
    setOcupado("cupom");
    const { data: v } = await supabase.rpc("validar_cupom", { p_code: cupom.trim() });
    if (!v?.[0]?.valido) { setOcupado(null); return setMsg({ t: "Cupom inválido ou inativo.", tipo: "erro" }); }
    const { error } = await supabase.rpc("aplicar_cupom", { p_code: cupom.trim() });
    setOcupado(null);
    if (error) return setMsg({ t: mensagemErro(error), tipo: "erro" });
    setMsg({ t: `Cupom aplicado: ${v[0].desconto_pct}% de desconto em todos os pagamentos.`, tipo: "ok" });
    recarregar();
  }

  async function assinar(code: string) {
    setMsg(null);
    setOcupado(`stripe-${code}`);
    const destino = destinoRetorno();
    const { data, erro } = await chamarFuncao<{ url: string }>("stripe-checkout", { plan_code: code, destino });
    if (erro || !data?.url) { setOcupado(null); return setMsg({ t: erro ?? "Falha ao abrir o pagamento.", tipo: "erro" }); }
    await abrir(data.url, destino);
    setOcupado(null);
    // aguarda o aviso do Stripe chegar ao servidor
    for (let i = 0; i < 4; i++) { await new Promise((r) => setTimeout(r, 2500)); await recarregar(); }
    planoCtx.recarregar();
  }

  // Pix ou cartão à vista (InfinitePay): o dinheiro cai direto na conta; o plano libera sozinho quando o pagamento é confirmado
  async function pagar(code: string) {
    if (ocupado) return;
    setMsg(null);
    setOcupado(code);
    const { data, erro } = await chamarFuncao<{ url: string; pagamento_id: string }>("infinitepay", { acao: "criar", plan_code: code, meses: Number(periodo ?? 1) });
    if (erro || !data?.url) { setOcupado(null); return setMsg({ t: erro ?? "Falha ao abrir o pagamento.", tipo: "erro" }); }
    setAguardando(data.pagamento_id);
    if (Platform.OS === "web") {
      // @ts-ignore
      window.location.href = data.url;
      return;
    }
    await WebBrowser.openBrowserAsync(data.url);
    setOcupado(null);
    esperarConfirmacao(data.pagamento_id);
  }

  async function esperarConfirmacao(id: string, slug?: string, tx?: string) {
    setMsg({ t: "Conferindo o pagamento…", tipo: "info" });
    for (let i = 0; i < 8; i++) {
      if (slug && tx) {
        const { data } = await chamarFuncao<{ pago: boolean }>("infinitepay", { acao: "confirmar", pagamento_id: id, slug, transaction_nsu: tx });
        if (data?.pago) break;
      } else {
        const { data } = await supabase.from("pagamentos").select("status").eq("id", id).maybeSingle();
        if (data?.status === "pago") break;
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    const { data: pg } = await supabase.from("pagamentos").select("status").eq("id", id).maybeSingle();
    setAguardando(null);
    await recarregar();
    planoCtx.recarregar();
    setMsg(pg?.status === "pago"
      ? { t: "Pagamento confirmado! Seu plano já está liberado. Obrigado!", tipo: "ok" }
      : { t: "Ainda não vimos o pagamento. Se você pagou, ele aparece em alguns minutos. Se não pagou, nada foi cobrado.", tipo: "info" });
  }

  // Voltando do pagamento na web: a InfinitePay manda slug e transaction_nsu no endereço
  useEffect(() => {
    if (pagamento?.id) esperarConfirmacao(pagamento.id, pagamento.slug, pagamento.transaction_nsu);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagamento?.id]);

  async function portal() {
    setOcupado("portal");
    const destino = destinoRetorno();
    const { data, erro } = await chamarFuncao<{ url: string }>("stripe-portal", { destino });
    if (erro || !data?.url) { setOcupado(null); return setMsg({ t: erro ?? "Falha ao abrir o portal.", tipo: "erro" }); }
    await abrir(data.url, destino);
    setOcupado(null);
    recarregar();
    planoCtx.recarregar();
  }

  // Voltando do pagamento: espera o aviso do Stripe e atualiza o plano
  useEffect(() => {
    if (retorno !== "sucesso" && retorno !== "portal") return;
    let vivo = true;
    (async () => {
      for (let i = 0; i < 5 && vivo; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        if (!vivo) return;
        await recarregar();
        planoCtx.recarregar();
      }
    })();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retorno]);

  if (carregando && !dados) return <Tela titulo="Planos" voltar><Carregando /></Tela>;
  const { planos, atual, assinatura, vinculo, precos } = dados!;
  const meses = Number(periodo ?? 1);
  const avulso = assinatura?.fonte === "manual" && String(assinatura?.id_externo ?? "").startsWith("infinitepay:");
  const desconto = vinculo?.desconto_pct ?? 0;

  return (
    <Tela titulo="Planos" voltar subtitulo={`Seu plano: ${atual?.nome ?? "Gratuito"} (${atual?.animais_ativos ?? 0} de ${atual?.max_animais ?? 1} animais)`}>
      <Aviso texto={msg?.t} tipo={msg?.tipo} />
      {assinatura && (
        <Cartao style={{ backgroundColor: cor.mataClara }}>
          <Text style={est.texto}>
            {avulso
              ? `Plano pago até ${br(assinatura.periodo_fim)}. Pague de novo antes de vencer e os meses se somam.`
              : assinatura.fonte === "manual"
              ? `Acesso liberado de presente${assinatura.periodo_fim ? ` até ${br(assinatura.periodo_fim)}` : ""}`
              : `Assinatura ${assinatura.status === "em_atraso" ? "com pagamento pendente" : "ativa"}${assinatura.periodo_fim ? ` · renova em ${br(assinatura.periodo_fim)}` : ""}`}
          </Text>
          {assinatura.fonte === "stripe" && (
            <Botao titulo="Trocar plano, cartão ou cancelar" tipo="secundario" onPress={portal} carregando={ocupado === "portal"} />
          )}
        </Cartao>
      )}

      <Cartao>
        <Text style={[est.texto, { fontWeight: "700" }]}>Grátis (1 animal)</Text>
        {["Anotar tocando", "Lembretes no celular (comida, água, remédio da receita, tarefas)", "Alimentação com avaliação por IA", "Assistente com IA (5 por dia, ou bem mais com a sua própria IA)", "Foto e documento do animal", "Últimos 30 dias de histórico"].map((t) => (
          <Text key={t} style={est.texto}>✓ {t}</Text>
        ))}
        <Text style={[est.texto, { fontWeight: "700", marginTop: 12 }]}>Pago: a partir de R$ 9,90 por mês</Text>
        {["Tudo do grátis, para mais animais", "PDF e WhatsApp para o veterinário", "Estoque, gastos e aviso de comprar de novo", "Fotos nas anotações", "Histórico completo e evolução do peso", "Resumo da semana", "Assistente: 30 por dia"].map((t) => (
          <Text key={t} style={est.texto}>✓ {t}</Text>
        ))}
      </Cartao>

      <Cabecalho texto="Cupom de indicação" />
      {vinculo ? (
        <Text style={est.texto}>Cupom <Text style={{ fontWeight: "700" }}>{vinculo.coupon_code}</Text> ativo: {desconto}% de desconto em todos os pagamentos.</Text>
      ) : (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
          <View style={{ flex: 1 }}><Campo rotulo="Tem um cupom?" value={cupom} onChangeText={setCupom} autoCapitalize="characters" /></View>
          <Botao titulo="Aplicar" tipo="secundario" onPress={aplicarCupom} carregando={ocupado === "cupom"} style={{ marginBottom: 12 }} />
        </View>
      )}

      <Cabecalho texto="Por quanto tempo?" />
      <Escolha valor={periodo} aoEscolher={(v) => v && setPeriodo(v)} opcoes={PERIODOS} />
      <Text style={[est.textoSuave, { marginTop: -6, marginBottom: 6 }]}>Pix ou cartão à vista. Quer parcelar? Pode, com os juros da maquininha por conta de quem parcela.</Text>
      <Cabecalho texto="Quantos animais?" />
      {planos.map((p: any) => {
        const ehAtual = atual?.code === p.code;
        const mensal = p.preco_mensal_centavos;
        const cheio = precos[`${p.code}|${meses}`] ?? mensal * meses;
        const total = desconto ? Math.round(cheio * (1 - desconto / 100)) : cheio;
        const economia = mensal * meses - cheio;
        return (
          <Cartao key={p.code} style={ehAtual ? { borderColor: cor.mata, borderWidth: 2 } : undefined}>
            <View style={est.entre}>
              <Text style={[est.texto, { fontWeight: "700", flex: 1 }]}>{p.nome}</Text>
              <View style={{ alignItems: "flex-end" }}>
                {mensal === 0 ? <Text style={[est.texto, { fontWeight: "700" }]}>Grátis</Text> : (
                  <>
                    {desconto > 0 && <Text style={[est.textoSuave, { textDecorationLine: "line-through" }]}>{reais(cheio)}</Text>}
                    <Text style={[est.texto, { fontWeight: "700", color: cor.mata }]}>{reais(total)}</Text>
                    {meses > 1 && <Text style={est.textoSuave}>{reais(Math.round(total / meses))}/mês</Text>}
                  </>
                )}
              </View>
            </View>
            <Text style={est.textoSuave}>
              Até {p.max_animais} {p.max_animais > 1 ? "animais" : "animal"}{mensal > 0 ? " · todas as funções" : " · funções básicas"}
              {mensal > 0 && economia > 0 ? ` · economia de ${reais(economia)}` : ""}
            </Text>
            {ehAtual && !avulso ? <Text style={[est.texto, { color: cor.mata, fontWeight: "700", marginTop: 6 }]}>Seu plano atual</Text> :
              mensal > 0 && assinatura?.fonte !== "stripe" && !(assinatura?.fonte === "manual" && !avulso) ? (
                <>
                  <Botao titulo={ehAtual ? `Renovar (${PERIODOS.find((x) => x.valor === periodo)?.rotulo})` : "Pagar com Pix ou cartão"} icone="qrcode"
                    onPress={() => pagar(p.code)} carregando={ocupado === p.code || (aguardando != null && ocupado === p.code)} />
                  {meses === 1 && !avulso && (
                    <Botao titulo="Ou: cartão com renovação automática" tipo="leve" onPress={() => assinar(p.code)} carregando={ocupado === `stripe-${p.code}`} />
                  )}
                </>
              ) : assinatura?.fonte === "stripe" && !ehAtual && mensal > 0 ? (
                <Botao titulo="Mudar para este" tipo="leve" onPress={portal} />
              ) : null}
          </Cartao>
        );
      })}
      <Text style={[est.textoSuave, { marginTop: 8 }]}>
        Pix e cartão à vista pela InfinitePay. A renovação automática no cartão é pelo Stripe e pode ser cancelada quando quiser. Ao vencer, você tem 5 dias para renovar sem perder nada; depois o app volta ao plano grátis, e suas anotações continuam guardadas.
      </Text>
    </Tela>
  );
}
