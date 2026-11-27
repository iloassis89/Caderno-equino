import React, { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { chamarFuncao, supabase, mensagemErro } from "../supabase";
import { carregarPlano, useCarga } from "../dados";
import { Aviso, Botao, Cabecalho, Campo, Carregando, Cartao, Tela, usePlano } from "../ui";
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

export default function Planos({ retorno }: { retorno?: string }) {
  const [cupom, setCupom] = useState("");
  const [msg, setMsg] = useState<{ t: string; tipo: "erro" | "ok" | "info" } | null>(
    retorno === "sucesso" ? { t: "Pagamento recebido. Seu plano é atualizado em alguns segundos.", tipo: "ok" }
      : retorno === "cancelado" ? { t: "Pagamento não concluído. Nada foi cobrado.", tipo: "info" } : null,
  );
  const [ocupado, setOcupado] = useState<string | null>(null);
  const planoCtx = usePlano();

  const { dados, carregando, recarregar } = useCarga(async () => {
    const { data: u } = await supabase.auth.getUser();
    const [planos, atual, assinatura, vinculo] = await Promise.all([
      supabase.from("plans").select("*").order("ordem"),
      carregarPlano(),
      supabase.from("subscriptions").select("*").in("status", ["ativa", "em_atraso"]).order("created_at", { ascending: false }).limit(1),
      supabase.from("referrals").select("desconto_pct, coupon_code").eq("customer_id", u.user?.id ?? "").maybeSingle(),
    ]);
    return { planos: planos.data ?? [], atual, assinatura: assinatura.data?.[0] ?? null, vinculo: vinculo.data };
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
    setMsg({ t: `Cupom aplicado: ${v[0].desconto_pct}% de desconto em todas as mensalidades.`, tipo: "ok" });
    recarregar();
  }

  async function assinar(code: string) {
    setMsg(null);
    setOcupado(code);
    const destino = destinoRetorno();
    const { data, erro } = await chamarFuncao<{ url: string }>("stripe-checkout", { plan_code: code, destino });
    if (erro || !data?.url) { setOcupado(null); return setMsg({ t: erro ?? "Falha ao abrir o pagamento.", tipo: "erro" }); }
    await abrir(data.url, destino);
    setOcupado(null);
    // aguarda o aviso do Stripe chegar ao servidor
    for (let i = 0; i < 4; i++) { await new Promise((r) => setTimeout(r, 2500)); await recarregar(); }
    planoCtx.recarregar();
  }

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
  const { planos, atual, assinatura, vinculo } = dados!;
  const desconto = vinculo?.desconto_pct ?? 0;

  return (
    <Tela titulo="Planos" voltar subtitulo={`Seu plano: ${atual?.nome ?? "Gratuito"} (${atual?.animais_ativos ?? 0} de ${atual?.max_animais ?? 1} animais)`}>
      <Aviso texto={msg?.t} tipo={msg?.tipo} />
      {assinatura && (
        <Cartao style={{ backgroundColor: cor.mataClara }}>
          <Text style={est.texto}>
            Assinatura {assinatura.status === "em_atraso" ? "com pagamento pendente" : "ativa"}
            {assinatura.periodo_fim ? ` · renova em ${br(assinatura.periodo_fim)}` : ""}
          </Text>
          {assinatura.fonte === "stripe" && (
            <Botao titulo="Trocar plano, cartão ou cancelar" tipo="secundario" onPress={portal} carregando={ocupado === "portal"} />
          )}
        </Cartao>
      )}

      <Cartao>
        <Text style={[est.texto, { fontWeight: "700" }]}>Grátis (1 animal)</Text>
        <Text style={est.texto}>Anotações, foto e documento de registro do animal, tarefas e os últimos 30 dias de histórico.</Text>
        <Text style={[est.texto, { fontWeight: "700", marginTop: 10 }]}>A partir de R$ 9,90 por mês</Text>
        <Text style={est.texto}>Tudo do grátis, mais: relatório em PDF e envio pelo WhatsApp ao veterinário, cálculo da alimentação, estoque e gastos, fotos nas anotações, histórico completo, evolução do peso e resumo da semana.</Text>
      </Cartao>

      <Cabecalho texto="Cupom de indicação" />
      {vinculo ? (
        <Text style={est.texto}>Cupom <Text style={{ fontWeight: "700" }}>{vinculo.coupon_code}</Text> ativo: {desconto}% de desconto em todas as mensalidades.</Text>
      ) : (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
          <View style={{ flex: 1 }}><Campo rotulo="Tem um cupom?" value={cupom} onChangeText={setCupom} autoCapitalize="characters" /></View>
          <Botao titulo="Aplicar" tipo="secundario" onPress={aplicarCupom} carregando={ocupado === "cupom"} style={{ marginBottom: 12 }} />
        </View>
      )}

      <Cabecalho texto="Escolha pelo número de animais" />
      {planos.map((p: any) => {
        const ehAtual = atual?.code === p.code;
        const preco = p.preco_mensal_centavos;
        const comDesconto = desconto ? Math.round(preco * (1 - desconto / 100)) : preco;
        return (
          <Cartao key={p.code} style={ehAtual ? { borderColor: cor.mata, borderWidth: 2 } : undefined}>
            <View style={est.entre}>
              <Text style={[est.texto, { fontWeight: "700", fontSize: 17, flex: 1 }]}>{p.nome}</Text>
              <View style={{ alignItems: "flex-end" }}>
                {preco === 0 ? <Text style={[est.texto, { fontWeight: "700" }]}>Grátis</Text> : (
                  <>
                    {desconto > 0 && <Text style={[est.textoSuave, { textDecorationLine: "line-through" }]}>{reais(preco)}</Text>}
                    <Text style={[est.texto, { fontWeight: "700", color: cor.mata }]}>{reais(comDesconto)}/mês</Text>
                  </>
                )}
              </View>
            </View>
            <Text style={est.textoSuave}>
              Até {p.max_animais} animal(is){p.max_animais > 1 && preco > 0 ? ` · ${reais(Math.round(comDesconto / p.max_animais))} por animal` : ""}
              {p.preco_mensal_centavos > 0 ? " · todas as funções" : " · funções básicas"}
              {p.permite_multiplos_responsaveis ? " · vários responsáveis" : ""}
            </Text>
            {ehAtual ? <Text style={[est.texto, { color: cor.mata, fontWeight: "700", marginTop: 6 }]}>Seu plano atual</Text> :
              preco > 0 ? <Botao titulo={assinatura ? "Mudar para este" : "Assinar"} onPress={() => (assinatura?.fonte === "stripe" ? portal() : assinar(p.code))}
                carregando={ocupado === p.code} /> : null}
          </Cartao>
        );
      })}
      <Text style={[est.textoSuave, { marginTop: 8 }]}>
        Pagamento seguro pelo Stripe. Cancele quando quiser; o acesso continua até o fim do mês pago.
      </Text>
    </Tela>
  );
}
