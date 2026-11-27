import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

// Chaves públicas (podem ficar no app). As chaves secretas ficam só no servidor.
export const SUPABASE_URL = "https://pdeztncayjsdjelbpxrp.supabase.co";
// Endereço do app na web (links de e-mail de cadastro e de troca de senha voltam para cá)
export const URL_APP_WEB = "https://iashorse.pages.dev/";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_KaSjsNBicnqs_5L9tgQWog_GvinCv3c";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: Platform.OS === "web" ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});

// Chama uma função de servidor e devolve { data, erro } com mensagem amigável
export async function chamarFuncao<T = any>(nome: string, corpo: Record<string, unknown>): Promise<{ data?: T; erro?: string }> {
  const { data, error } = await supabase.functions.invoke(nome, { body: corpo });
  if (error) {
    let msg = "Não foi possível concluir. Verifique a internet e tente de novo.";
    try {
      const ctx: any = (error as any).context;
      if (ctx && typeof ctx.json === "function") {
        const j = await ctx.json();
        if (j?.erro) msg = j.erro;
      }
    } catch {}
    return { erro: msg };
  }
  return { data: data as T };
}

export function mensagemErro(e: any): string {
  const m = (e?.message ?? "") as string;
  if (/Failed to fetch|Network request failed|NetworkError|Load failed/i.test(m)) return "Sem internet no momento. Tente de novo.";
  if (m.includes("Limite do plano")) return m;
  if (m.includes("Invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("User already registered")) return "Este e-mail já tem conta. Use Entrar.";
  if (m.includes("Password should be")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("Email not confirmed")) return "Confirme seu e-mail pelo link que enviamos.";
  if (m.includes("row-level security")) return "Não foi permitido. Se for uma função do plano pago, veja Planos.";
  return m || "Algo deu errado. Tente de novo.";
}
