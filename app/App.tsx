import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, AppState, BackHandler, Platform, Pressable, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./src/supabase";
import { carregarPlano, ehPago } from "./src/dados";
import { Icone, NavContexto, PlanoContexto, type Rota } from "./src/ui";
import { cor } from "./src/tema";
import Entrar, { NovaSenha } from "./src/telas/Entrar";
import Inicio from "./src/telas/Inicio";
import { Animais, NovoAnimal } from "./src/telas/Animais";
import { Documentos, Ficha, FotosAnotacao, Historico, NovoRegistro } from "./src/telas/Registros";
import { Estoque, NovoItem, NovoMovimento } from "./src/telas/Estoque";
import { Agenda, LembreteFeito, NovaTarefa, NovoLembrete } from "./src/telas/Agenda";
import MinhaIA from "./src/telas/MinhaIA";
import { limparAvisos, ouvirToques, sincronizarLembretes } from "./src/lembretes";
import Resumo from "./src/telas/Resumo";
import Planos from "./src/telas/Planos";
import Dieta from "./src/telas/Dieta";
import { Afiliado, Ajuda, Mais } from "./src/telas/Mais";
import Assistente from "./src/telas/Assistente";
import { Admin, AdminAnuncios, AdminCortesias, AdminDiagnostico, AdminDicas } from "./src/telas/Admin";
import { Dicas, Tutorial, tutorialJaVisto } from "./src/conteudo";
import { AdminConfig, AdminConversa, AdminPedidos, AdminPedidosAnuncio, AdminSuporte, Suporte, SuporteConversa } from "./src/telas/Suporte";

// Cinco abas, sempre com ícone e nome escrito
const ABAS = [
  { nome: "Inicio", rotulo: "Início", icone: "home-outline" },
  { nome: "Animais", rotulo: "Animais", icone: "horse-variant" },
  { nome: "Anotar", rotulo: "Anotar", icone: "plus-circle", destaque: true },
  { nome: "Agenda", rotulo: "Agenda", icone: "bell-outline" },
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
    case "Tarefas": case "Agenda": return <Agenda />;
    case "NovaTarefa": return <NovaTarefa tarefa={p.tarefa} />;
    case "NovoLembrete": return <NovoLembrete lembrete={p.lembrete} animalId={p.animalId} tipo={p.tipo} />;
    case "LembreteFeito": return <LembreteFeito id={p.id} horario={p.horario ?? ""} dia={p.dia} antes={p.antes} />;
    case "FotosAnotacao": return <FotosAnotacao recordId={p.recordId} animalId={p.animalId} />;
    case "Ajuda": return <Ajuda />;
    case "MinhaIA": return <MinhaIA />;
    case "Resumo": return <Resumo />;
    case "Planos": return <Planos retorno={p.retorno} />;
    case "Mais": return <Mais />;
    case "Tutorial": return <TutorialRota />;
    case "Afiliado": return <Afiliado />;
    case "Dicas": return <Dicas />;
    case "Assistente": return <Assistente />;
    case "Admin": return <Admin />;
    case "AdminCortesias": return <AdminCortesias />;
    case "AdminAnuncios": return <AdminAnuncios pedido={p.pedido} />;
    case "AdminDicas": return <AdminDicas />;
    case "Suporte": return <Suporte />;
    case "SuporteConversa": return <SuporteConversa id={p.id} assunto={p.assunto} />;
    case "AdminSuporte": return <AdminSuporte />;
    case "AdminConversa": return <AdminConversa id={p.id} />;
    case "AdminPedidos": return <AdminPedidos />;
    case "AdminPedidosAnuncio": return <AdminPedidosAnuncio />;
    case "AdminConfig": return <AdminConfig />;
    case "AdminDiagnostico": return <AdminDiagnostico />;
    default: return <Inicio />;
  }
}

function TutorialRota() {
  const nav = React.useContext(NavContexto);
  return <Tutorial aoConcluir={nav.voltar} />;
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
  const [trocarSenha, setTrocarSenha] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [mostrarTutorial, setMostrarTutorial] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      setSessao(s);
      if (evento === "PASSWORD_RECOVERY") setTrocarSenha(true);
      if (evento === "SIGNED_OUT") { limparAvisos(); setPago(false); setAdmin(false); setPilha([{ nome: "Inicio" }]); setVersao((v) => v + 1); setTrocarSenha(false); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const recarregarPlano = useCallback(() => {
    carregarPlano().then((p) => setPago(ehPago(p))).catch(() => setPago(false));
    supabase.rpc("is_admin").then(({ data }) => setAdmin(data === true));
  }, []);
  useEffect(() => { if (sessao) recarregarPlano(); }, [sessao, recarregarPlano]);
  // Primeira vez no app: mostra o tutorial
  const logado = !!sessao;
  useEffect(() => { if (logado) tutorialJaVisto().then((visto) => setMostrarTutorial(!visto)); }, [logado]);

  // Despertadores: reagenda ao entrar e abre o "Feito" quando a pessoa toca no aviso
  useEffect(() => {
    if (!logado) return;
    sincronizarLembretes().catch(() => {});
    // volta do segundo plano: reagenda (mantém a janela de 14 dias dos remédios)
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") sincronizarLembretes().catch(() => {}); });
    const parar = ouvirToques((id, horario, dia, antes) => {
      setPilha([{ nome: "Inicio" }, { nome: "LembreteFeito", params: { id, horario, dia, antes } }]);
      setVersao((v) => v + 1);
    });
    return () => { sub.remove(); parar(); };
  }, [logado]);

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

  const voltarInterno = useCallback(() => {
    setPilha((p) => (p.length > 1 ? p.slice(0, -1) : p[0].nome !== "Inicio" ? [{ nome: "Inicio" }] : p));
    setVersao((v) => v + 1);
    recarregarPlano();
  }, [recarregarPlano]);

  const nav = useMemo(() => ({
    ir: (nome: string, params?: any) => {
      setPilha((p) => [...p, { nome, params }]);
      // @ts-ignore
      if (Platform.OS === "web") window.history.pushState({ ias: true }, "");
    },
    voltar: () => {
      // @ts-ignore
      if (Platform.OS === "web" && window.history.state?.ias) window.history.back(); else voltarInterno();
    },
    aba: (nome: string) => { setPilha([{ nome }]); setVersao((v) => v + 1); },
  }), [voltarInterno]);

  // Botão/gesto de voltar do navegador volta uma tela dentro do app
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const aoVoltar = () => voltarInterno();
    // @ts-ignore
    window.addEventListener("popstate", aoVoltar);
    // @ts-ignore
    return () => window.removeEventListener("popstate", aoVoltar);
  }, [voltarInterno]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const h = BackHandler.addEventListener("hardwareBackPress", () => {
      if (pilha.length > 1 || pilha[0].nome !== "Inicio") { voltarInterno(); return true; }
      return false;
    });
    return () => h.remove();
  }, [pilha, voltarInterno]);

  if (sessao === undefined || (sessao && mostrarTutorial === null)) {
    return <View style={{ flex: 1, backgroundColor: cor.papel, justifyContent: "center" }}><ActivityIndicator color={cor.mata} size="large" /></View>;
  }

  const atual = pilha[pilha.length - 1];
  const abaAtiva = pilha[0].nome;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1, backgroundColor: cor.papel }} edges={["top", "left", "right"]}>
        {!sessao ? <Entrar /> : trocarSenha ? <NovaSenha aoConcluir={() => setTrocarSenha(false)} /> : mostrarTutorial ? <Tutorial aoConcluir={() => setMostrarTutorial(false)} /> : (
          <PlanoContexto.Provider value={{ pago, admin, recarregar: recarregarPlano }}>
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
                        <View style={a.destaque ? { backgroundColor: cor.mata, borderRadius: 22, width: 56, height: 44, alignItems: "center", justifyContent: "center" }
                          : { backgroundColor: ativa ? cor.mataClara : "transparent", borderRadius: 16, width: 64, height: 32, alignItems: "center", justifyContent: "center" }}>
                          <Icone nome={a.icone} tamanho={a.destaque ? 30 : 26} cor={c} />
                        </View>
                        <Text style={{ fontSize: 15, color: ativa || a.destaque ? cor.mata : cor.tintaSuave, fontWeight: ativa ? "700" : "500", marginTop: 2 }}>{a.rotulo}</Text>
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
