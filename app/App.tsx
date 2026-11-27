import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, BackHandler, Platform, Pressable, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./src/supabase";
import { carregarPlano, ehPago } from "./src/dados";
import { Icone, NavContexto, PlanoContexto, type Rota } from "./src/ui";
import { cor } from "./src/tema";
import Entrar from "./src/telas/Entrar";
import Inicio from "./src/telas/Inicio";
import { Animais, NovoAnimal } from "./src/telas/Animais";
import { Documentos, Ficha, Historico, NovoRegistro } from "./src/telas/Registros";
import { Estoque, NovoItem, NovoMovimento } from "./src/telas/Estoque";
import { NovaTarefa, Tarefas } from "./src/telas/Tarefas";
import Resumo from "./src/telas/Resumo";
import Planos from "./src/telas/Planos";
import Dieta from "./src/telas/Dieta";
import { Afiliado, Mais } from "./src/telas/Mais";

// Cinco abas, sempre com ícone e nome escrito
const ABAS = [
  { nome: "Inicio", rotulo: "Início", icone: "home-outline" },
  { nome: "Animais", rotulo: "Animais", icone: "horse-variant" },
  { nome: "Anotar", rotulo: "Anotar", icone: "plus-circle", destaque: true },
  { nome: "Historico", rotulo: "Histórico", icone: "book-open-variant" },
  { nome: "Mais", rotulo: "Mais", icone: "dots-horizontal-circle-outline" },
];

function renderizar(r: Rota) {
  const p = r.params ?? {};
  switch (r.nome) {
    case "Inicio": return <Inicio />;
    case "Animais": return <Animais />;
    case "NovoAnimal": return <NovoAnimal animal={p.animal} />;
    case "Ficha": return <Ficha id={p.id} />;
    case "Documentos": return <Documentos animalId={p.animalId} nome={p.nome} />;
    case "Dieta": return <Dieta animalId={p.animalId} nome={p.nome} />;
    case "Anotar": return <NovoRegistro />;
    case "Historico": return <Historico />;
    case "NovoRegistro": return <NovoRegistro registro={p.registro} animalId={p.animalId} />;
    case "Estoque": return <Estoque />;
    case "NovoItem": return <NovoItem />;
    case "NovoMovimento": return <NovoMovimento itemId={p.itemId} />;
    case "Tarefas": return <Tarefas />;
    case "NovaTarefa": return <NovaTarefa />;
    case "Resumo": return <Resumo />;
    case "Planos": return <Planos retorno={p.retorno} />;
    case "Mais": return <Mais />;
    case "Afiliado": return <Afiliado />;
    default: return <Inicio />;
  }
}

// Lê ?status= no retorno do pagamento (web) ou do link do app
function statusDoRetorno(url: string | null) {
  if (!url) return null;
  try {
    const { queryParams } = Linking.parse(url);
    const s = queryParams?.status;
    return typeof s === "string" ? s : null;
  } catch { return null; }
}

export default function App() {
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined);
  const [pilha, setPilha] = useState<Rota[]>([{ nome: "Inicio" }]);
  const [versao, setVersao] = useState(0);
  const [pago, setPago] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const recarregarPlano = useCallback(() => {
    carregarPlano().then((p) => setPago(ehPago(p))).catch(() => {});
  }, []);
  useEffect(() => { if (sessao) recarregarPlano(); }, [sessao, recarregarPlano]);

  // Volta do Stripe: abre a tela de planos com a mensagem certa
  useEffect(() => {
    const tratar = (url: string | null) => {
      const st = statusDoRetorno(url);
      if (st) {
        setPilha([{ nome: "Inicio" }, { nome: "Planos", params: { retorno: st } }]);
        if (Platform.OS === "web") {
          // @ts-ignore
          window.history.replaceState({}, "", window.location.pathname);
        }
      }
    };
    Linking.getInitialURL().then(tratar);
    const s = Linking.addEventListener("url", (e) => tratar(e.url));
    return () => s.remove();
  }, []);

  const nav = useMemo(() => ({
    ir: (nome: string, params?: any) => setPilha((p) => [...p, { nome, params }]),
    voltar: () => { setPilha((p) => (p.length > 1 ? p.slice(0, -1) : p)); setVersao((v) => v + 1); recarregarPlano(); },
    aba: (nome: string) => { setPilha([{ nome }]); setVersao((v) => v + 1); },
  }), [recarregarPlano]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const h = BackHandler.addEventListener("hardwareBackPress", () => {
      if (pilha.length > 1) { nav.voltar(); return true; }
      return false;
    });
    return () => h.remove();
  }, [pilha.length, nav]);

  if (sessao === undefined) {
    return <View style={{ flex: 1, backgroundColor: cor.papel, justifyContent: "center" }}><ActivityIndicator color={cor.mata} size="large" /></View>;
  }

  const atual = pilha[pilha.length - 1];
  const abaAtiva = pilha[0].nome;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1, backgroundColor: cor.papel }} edges={["top", "left", "right"]}>
        {!sessao ? <Entrar /> : (
          <PlanoContexto.Provider value={{ pago, recarregar: recarregarPlano }}>
            <NavContexto.Provider value={nav}>
              <View style={{ flex: 1 }} key={`${pilha.length}-${atual.nome}-${versao}`}>
                {renderizar(atual)}
              </View>
              <SafeAreaView edges={["bottom"]} style={{ backgroundColor: cor.cartao, borderTopWidth: 1, borderColor: cor.linha }}>
                <View style={{ flexDirection: "row", maxWidth: 720, width: "100%", alignSelf: "center" }}>
                  {ABAS.map((a) => {
                    const ativa = abaAtiva === a.nome;
                    const c = a.destaque ? cor.branco : ativa ? cor.mata : cor.tintaSuave;
                    return (
                      <Pressable key={a.nome} onPress={() => nav.aba(a.nome)} accessibilityRole="tab" accessibilityLabel={a.rotulo}
                        accessibilityState={{ selected: ativa }}
                        style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 6, minHeight: 64 }}>
                        <View style={a.destaque ? { backgroundColor: ativa ? cor.couro : cor.mata, borderRadius: 26, width: 52, height: 40, alignItems: "center", justifyContent: "center" } : undefined}>
                          <Icone nome={a.icone} tamanho={a.destaque ? 30 : 28} cor={c} />
                        </View>
                        <Text style={{ fontSize: 14, color: ativa || a.destaque ? cor.mata : cor.tintaSuave, fontWeight: ativa ? "700" : "500", marginTop: 2 }}>{a.rotulo}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </SafeAreaView>
            </NavContexto.Provider>
          </PlanoContexto.Provider>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
