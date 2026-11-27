// Fotos e documentos: tirar foto, escolher da galeria ou anexar arquivo (PDF ou imagem)
import React, { useState } from "react";
import { Image, Platform, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as WebBrowser from "expo-web-browser";
import { supabase, mensagemErro } from "./supabase";
import { useCarga } from "./dados";
import { Aviso, Botao, Icone, Vazio } from "./ui";
import { cor, est, tam } from "./tema";

const BUCKET = "evidencias";

type Arquivo = { uri: string; nome: string; mime: string; tamanho?: number | null; file?: any };

function extensao(nome: string, mime: string) {
  const m = nome.match(/\.([a-z0-9]{2,5})$/i);
  if (m) return m[1].toLowerCase();
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("png")) return "png";
  if (mime.includes("heic")) return "heic";
  return "jpg";
}

function idAleatorio() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export async function enviarArquivo(arq: Arquivo, dados: { animalId: string; recordId?: string | null; tipo: string }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Faça login de novo.");
  const caminho = `${u.user.id}/${dados.animalId}/${idAleatorio()}.${extensao(arq.nome, arq.mime)}`;
  let corpo: any;
  if (Platform.OS === "web") {
    corpo = arq.file ?? (await (await fetch(arq.uri)).blob());
  } else {
    corpo = await (await fetch(arq.uri)).arrayBuffer();
  }
  const up = await supabase.storage.from(BUCKET).upload(caminho, corpo, { contentType: arq.mime, upsert: false });
  if (up.error) throw up.error;
  const { error } = await supabase.from("anexos").insert({
    animal_id: dados.animalId, record_id: dados.recordId ?? null, tipo: dados.tipo,
    nome: arq.nome, caminho, mime: arq.mime, tamanho: arq.tamanho ?? null,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([caminho]);
    throw error;
  }
}

export async function linkTemporario(caminho: string, segundos = 3600) {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(caminho, segundos);
  return data?.signedUrl ?? null;
}

export async function abrirAnexo(caminho: string) {
  const url = await linkTemporario(caminho, 600);
  if (!url) return;
  if (Platform.OS === "web") {
    // @ts-ignore
    window.open(url, "_blank");
  } else {
    await WebBrowser.openBrowserAsync(url);
  }
}

async function tirarFoto(): Promise<Arquivo | null> {
  if (Platform.OS !== "web") {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) throw new Error("Permita o uso da câmera nas configurações do celular.");
  }
  const r = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.6 });
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  return { uri: a.uri, nome: a.fileName ?? "foto.jpg", mime: a.mimeType ?? "image/jpeg", tamanho: a.fileSize, file: (a as any).file };
}

async function daGaleria(): Promise<Arquivo | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  return { uri: a.uri, nome: a.fileName ?? "foto.jpg", mime: a.mimeType ?? "image/jpeg", tamanho: a.fileSize, file: (a as any).file };
}

async function deArquivo(): Promise<Arquivo | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"], copyToCacheDirectory: true });
  if (r.canceled || !r.assets?.[0]) return null;
  const a = r.assets[0];
  return { uri: a.uri, nome: a.name, mime: a.mimeType ?? "application/octet-stream", tamanho: a.size, file: (a as any).file };
}

// Três botões grandes: Tirar foto, Galeria, Arquivo
export function BotoesAnexar({ aoEscolher, arquivo = true, carregando }: {
  aoEscolher: (a: Arquivo) => void; arquivo?: boolean; carregando?: boolean;
}) {
  const [erro, setErro] = useState<string | null>(null);
  async function usar(fn: () => Promise<Arquivo | null>) {
    setErro(null);
    try {
      const a = await fn();
      if (a) {
        if (a.tamanho && a.tamanho > 15 * 1024 * 1024) return setErro("Arquivo grande demais (máximo 15 MB).");
        aoEscolher(a);
      }
    } catch (e: any) {
      setErro(mensagemErro(e));
    }
  }
  const botoes = [
    { t: "Tirar foto", i: "camera", f: tirarFoto },
    { t: "Galeria", i: "image-multiple", f: daGaleria },
    ...(arquivo ? [{ t: "Arquivo", i: "file-document-outline", f: deArquivo }] : []),
  ];
  return (
    <View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {botoes.map((b) => (
          <Pressable key={b.t} onPress={() => usar(b.f)} disabled={carregando} accessibilityRole="button" accessibilityLabel={b.t}
            style={({ pressed }) => ({
              flex: 1, minHeight: 76, borderRadius: 12, borderWidth: 2, borderColor: cor.mata, backgroundColor: cor.branco,
              alignItems: "center", justifyContent: "center", gap: 4, opacity: carregando ? 0.5 : pressed ? 0.8 : 1,
            })}>
            <Icone nome={b.i} tamanho={30} cor={cor.mata} />
            <Text style={{ fontSize: tam.pequeno, fontWeight: "700", color: cor.mata }}>{b.t}</Text>
          </Pressable>
        ))}
      </View>
      <Aviso texto={erro} tipo="erro" />
    </View>
  );
}

// Lista de anexos de um animal (ou de uma anotação), com botões para adicionar
export function Anexos({ animalId, recordId, tipo, titulo, vazio }: {
  animalId: string; recordId?: string | null; tipo: "registro" | "foto_animal" | "documento" | "evidencia";
  titulo?: string; vazio?: string;
}) {
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ t: string; tipo: "erro" | "ok" } | null>(null);
  const { dados, recarregar } = useCarga(async () => {
    let q = supabase.from("anexos").select("*").eq("animal_id", animalId).eq("tipo", tipo).order("created_at", { ascending: false });
    q = recordId ? q.eq("record_id", recordId) : q.is("record_id", null);
    const { data } = await q;
    const lista = data ?? [];
    // miniaturas das imagens
    return Promise.all(lista.map(async (a: any) => ({
      ...a, miniatura: a.mime?.startsWith("image/") ? await linkTemporario(a.caminho) : null,
    })));
  }, [animalId, recordId, tipo]);

  async function adicionar(a: Arquivo) {
    setMsg(null);
    setEnviando(true);
    try {
      await enviarArquivo(a, { animalId, recordId, tipo });
      setMsg({ t: "Arquivo guardado.", tipo: "ok" });
      recarregar();
    } catch (e: any) {
      setMsg({ t: mensagemErro(e), tipo: "erro" });
    } finally {
      setEnviando(false);
    }
  }

  async function apagar(a: any) {
    await supabase.from("anexos").delete().eq("id", a.id);
    await supabase.storage.from(BUCKET).remove([a.caminho]);
    recarregar();
  }

  return (
    <View>
      {titulo ? <Text style={[est.texto, { fontWeight: "700", marginBottom: 8 }]}>{titulo}</Text> : null}
      {(dados ?? []).length === 0 ? <Vazio texto={vazio ?? "Nada guardado ainda."} /> : (
        <View style={{ gap: 8, marginBottom: 8 }}>
          {(dados ?? []).map((a: any) => (
            <View key={a.id} style={[est.linha, { gap: 10, backgroundColor: cor.branco, borderRadius: 10, borderWidth: 1, borderColor: cor.linha, padding: 8 }]}>
              <Pressable onPress={() => abrirAnexo(a.caminho)} style={[est.linha, { gap: 10, flex: 1 }]} accessibilityRole="button" accessibilityLabel={`Abrir ${a.nome ?? "arquivo"}`}>
                {a.miniatura ? <Image source={{ uri: a.miniatura }} style={{ width: 56, height: 56, borderRadius: 8 }} /> :
                  <Icone nome={a.mime?.includes("pdf") ? "file-pdf-box" : "file-document-outline"} tamanho={44} cor={cor.barro} />}
                <View style={{ flex: 1 }}>
                  <Text style={[est.texto, { fontSize: tam.pequeno }]} numberOfLines={1}>{a.nome ?? "Arquivo"}</Text>
                  <Text style={est.textoSuave}>Toque para abrir</Text>
                </View>
              </Pressable>
              <Pressable onPress={() => apagar(a)} accessibilityRole="button" accessibilityLabel="Apagar arquivo" style={{ padding: 10 }}>
                <Icone nome="trash-can-outline" cor={cor.barro} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <BotoesAnexar aoEscolher={adicionar} carregando={enviando} arquivo={tipo !== "foto_animal"} />
      {enviando && <Text style={[est.textoSuave, { marginTop: 6 }]}>Enviando…</Text>}
      <Aviso texto={msg?.t} tipo={msg?.tipo} />
    </View>
  );
}

// Foto principal do animal (a mais recente)
export function FotoAnimal({ animalId, tamanho = 120 }: { animalId: string; tamanho?: number }) {
  const { dados } = useCarga(async () => {
    const { data } = await supabase.from("anexos").select("caminho").eq("animal_id", animalId).eq("tipo", "foto_animal")
      .order("created_at", { ascending: false }).limit(1);
    return data?.[0] ? await linkTemporario(data[0].caminho) : null;
  }, [animalId]);
  if (!dados) {
    return (
      <View style={{ width: tamanho, height: tamanho, borderRadius: 16, backgroundColor: cor.mataClara, alignItems: "center", justifyContent: "center" }}>
        <Icone nome="horse-variant" tamanho={tamanho * 0.55} cor={cor.mata} />
      </View>
    );
  }
  return <Image source={{ uri: dados }} style={{ width: tamanho, height: tamanho, borderRadius: 16 }} accessibilityLabel="Foto do animal" />;
}

export { Botao };
