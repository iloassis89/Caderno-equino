import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

export type Plano = {
  code: string; nome: string; max_animais: number; permite_estoque: boolean;
  permite_multiplos_responsaveis: boolean; animais_ativos: number;
};

export async function carregarPlano(): Promise<Plano | null> {
  const { data } = await supabase.rpc("meu_plano");
  return (data?.[0] as Plano) ?? null;
}

export async function carregarAnimais(somenteAtivos = true) {
  let q = supabase.from("animals").select("*").order("nome");
  if (somenteAtivos) q = q.eq("ativo", true);
  const { data } = await q;
  return data ?? [];
}

// Hook genérico: carrega e permite recarregar
export function useCarga<T>(fn: () => Promise<T>, deps: any[] = []) {
  const [dados, setDados] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const recarregar = useCallback(async () => {
    setCarregando(true);
    try { setDados(await fn()); } finally { setCarregando(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { recarregar(); }, [recarregar]);
  return { dados, carregando, recarregar };
}
