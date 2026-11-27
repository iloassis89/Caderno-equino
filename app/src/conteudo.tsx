// Tutorial, dicas e anúncios
import React, { useEffect, useRef, useState } from "react";
import { Image, Linking, Platform, Pressable, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { ok, useCarga } from "./dados";
import { Botao, Cabecalho, Carregando, Cartao, ErroCarga, Icone, Tela, Vazio, useNav } from "./ui";
import { NOME_APP } from "./constantes";
import { cor, est, tam } from "./tema";

function hojeLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---------- Tutorial ----------
const CHAVE_TUTORIAL = "ias_tutorial_visto_v2";

export async function tutorialJaVisto() {
  try { return (await AsyncStorage.getItem(CHAVE_TUTORIAL)) === "1"; } catch { return true; }
}
export async function marcarTutorialVisto() {
  try { await AsyncStorage.setItem(CHAVE_TUTORIAL, "1"); } catch {}
}

const PASSOS = [
  { icone: "horse-variant", titulo: `Bem-vindo ao ${NOME_APP}`, texto: "O caderno do seu cavalo no celular. Menos papel, menos esquecimento, mais tempo para você." },
  { icone: "plus-circle", titulo: "1. Cadastre o animal", texto: "Em “Animais”, toque em “Cadastrar animal”. Só o nome é obrigatório." },
  { icone: "gesture-tap", titulo: "2. Anote tocando", texto: "No botão verde “Anotar”, escolha o assunto e toque nas opções. Hoje e Feito já vêm marcados. Escrever é opcional." },
  { icone: "bell-ring-outline", titulo: "3. O celular lembra por você", texto: "Na “Agenda”, crie lembretes da comida, da água, do remédio da receita e do ferrador. Na hora, o celular toca e um toque marca como feito." },
  { icone: "robot-outline", titulo: "4. Alimentação com IA", texto: "Na ficha, em Alimentação, anote o que ele come e toque em “Avaliar com a IA” para ver o que pode estar sobrando ou faltando. Sempre confirme com o veterinário." },
];

export function Tutorial({ aoConcluir }: { aoConcluir: () => void }) {
  const [i, setI] = useState(0);
  const p = PASSOS[i];
  const ultimo = i === PASSOS.length - 1;
  async function fim() { await marcarTutorialVisto(); aoConcluir(); }
  return (
    <Tela titulo="Como usar o app" subtitulo={`Passo ${i + 1} de ${PASSOS.length}`}>
      <Cartao style={{ alignItems: "center", paddingVertical: 28 }}>
        <View style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: cor.mataClara, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Icone nome={p.icone} tamanho={64} cor={cor.mata} />
        </View>
        <Text style={[est.titulo, { fontSize: 24, textAlign: "center" }]}>{p.titulo}</Text>
        <Text style={[est.texto, { textAlign: "center", marginTop: 8 }]}>{p.texto}</Text>
      </Cartao>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginVertical: 8 }}>
        {PASSOS.map((_, n) => (
          <View key={n} style={{ width: n === i ? 22 : 10, height: 10, borderRadius: 5, backgroundColor: n === i ? cor.mata : cor.linha }} />
        ))}
      </View>
      <Botao titulo={ultimo ? "Começar a usar" : "Próximo"} icone={ultimo ? "check" : "arrow-right"} onPress={ultimo ? fim : () => setI(i + 1)} />
      {i > 0 && <Botao titulo="Voltar" tipo="leve" icone="arrow-left" onPress={() => setI(i - 1)} />}
      {!ultimo && (
        <Pressable onPress={fim} style={{ minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 6 }} accessibilityRole="button">
          <Text style={{ color: cor.couro, fontSize: tam.texto, fontWeight: "700" }}>Pular tutorial</Text>
        </Pressable>
      )}
    </Tela>
  );
}

// ---------- Dicas ----------
async function carregarDicas() {
  return ok(await supabase.from("dicas").select("*").eq("ativo", true).order("ordem").order("created_at")) ?? [];
}

export function DicaDoDia() {
  const nav = useNav();
  const { dados } = useCarga(carregarDicas);
  if (!dados || dados.length === 0) return null;
  const [a, m, dd] = hojeLocal().split("-").map(Number);
  const indice = Math.floor(Date.UTC(a, m - 1, dd) / 86400000);
  const d: any = dados[indice % dados.length];
  return (
    <Cartao onPress={() => nav.ir("Dicas")} style={{ backgroundColor: cor.ouroClaro, borderColor: cor.palha }}>
      <View style={[est.linha, { gap: 8, marginBottom: 4 }]}>
        <Icone nome="lightbulb-on-outline" cor={cor.ouro} />
        <Text style={{ color: cor.ouro, fontWeight: "700", fontSize: tam.pequeno }}>Dica do dia</Text>
      </View>
      <Text style={[est.texto, { fontWeight: "700" }]}>{d.titulo}</Text>
      <Text style={est.texto}>{d.texto}</Text>
    </Cartao>
  );
}

export function Dicas() {
  const { dados, carregando, erro, recarregar } = useCarga(carregarDicas);
  return (
    <Tela titulo="Dicas" voltar subtitulo="Cuidados do dia a dia. Em caso de doença ou dúvida séria, chame o veterinário.">
      <ErroCarga erro={erro} tentar={recarregar} />
      {carregando && !dados ? <Carregando /> : (dados ?? []).length === 0 ? <Vazio texto="Nenhuma dica ainda." /> :
        (dados ?? []).map((d: any) => (
          <Cartao key={d.id}>
            <View style={[est.linha, { gap: 8 }]}>
              <Icone nome="lightbulb-on-outline" cor={cor.ouro} />
              <Text style={[est.texto, { fontWeight: "700", flex: 1 }]}>{d.titulo}</Text>
            </View>
            <Text style={[est.texto, { marginTop: 4 }]}>{d.texto}</Text>
            {d.fonte ? <Text style={[est.textoSuave, { fontSize: 13, marginTop: 4 }]}>Fonte: {d.fonte}</Text> : null}
          </Cartao>
        ))}
      <Cabecalho texto="Ainda com dúvida?" />
      <AtalhoAssistente />
      <Anuncio />
    </Tela>
  );
}

export function AtalhoAssistente() {
  const nav = useNav();
  return (
    <Cartao onPress={() => nav.ir("Assistente")}>
      <View style={[est.linha, { gap: 12 }]}>
        <Icone nome="chat-question-outline" tamanho={32} cor={cor.mata} />
        <View style={{ flex: 1 }}>
          <Text style={[est.texto, { fontWeight: "700" }]}>Pergunte à IA</Text>
          <Text style={est.textoSuave}>Uma dúvida rápida por vez, resposta na hora</Text>
        </View>
        <Icone nome="chevron-right" tamanho={28} cor={cor.tintaSuave} />
      </View>
    </Cartao>
  );
}

// ---------- Anúncio ----------
let cacheAnuncios: { quando: number; lista: any[] } | null = null;

export function Anuncio() {
  const [anuncio, setAnuncio] = useState<any | null>(null);
  const contado = useRef(false);
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        if (!cacheAnuncios || Date.now() - cacheAnuncios.quando > 5 * 60 * 1000) {
          const hoje = hojeLocal();
          const lista = ok(await supabase.from("anuncios").select("id,anunciante,titulo,texto,imagem_url,link_url,fim,publico")
            .eq("ativo", true).lte("inicio", hoje)) ?? [];
          cacheAnuncios = { quando: Date.now(), lista: lista.filter((a: any) => !a.fim || a.fim >= hoje) };
        }
        const l = cacheAnuncios.lista;
        if (vivo && l.length) setAnuncio(l[Math.floor(Math.random() * l.length)]);
      } catch {}
    })();
    return () => { vivo = false; };
  }, []);
  useEffect(() => {
    if (anuncio && !contado.current) {
      contado.current = true;
      supabase.rpc("contar_anuncio", { p_id: anuncio.id, p_clique: false }).then(() => {});
    }
  }, [anuncio]);
  if (!anuncio) return null;
  async function abrir() {
    if (!anuncio.link_url || !/^https:\/\//i.test(anuncio.link_url)) return;
    supabase.rpc("contar_anuncio", { p_id: anuncio.id, p_clique: true }).then(() => {});
    if (Platform.OS === "web") {
      // @ts-ignore
      window.open(anuncio.link_url, "_blank", "noopener,noreferrer");
    } else {
      Linking.openURL(anuncio.link_url);
    }
  }
  return (
    <Cartao onPress={anuncio.link_url ? abrir : undefined} style={{ borderStyle: "dashed", borderColor: cor.palha }}>
      <Text style={[est.textoSuave, { fontSize: 13, marginBottom: 6 }]}>Publicidade · {anuncio.anunciante}</Text>
      {anuncio.imagem_url ? (
        <Image source={{ uri: anuncio.imagem_url }} style={{ width: "100%", aspectRatio: 2, borderRadius: 8, marginBottom: 8 }} resizeMode="cover"
          accessibilityLabel={`Anúncio de ${anuncio.anunciante}`} />
      ) : null}
      <Text style={[est.texto, { fontWeight: "700" }]}>{anuncio.titulo}</Text>
      {anuncio.texto ? <Text style={est.texto}>{anuncio.texto}</Text> : null}
      {anuncio.link_url ? <Text style={{ color: cor.couro, fontWeight: "700", fontSize: tam.pequeno, marginTop: 6 }}>Toque para saber mais</Text> : null}
    </Cartao>
  );
}
