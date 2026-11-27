import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

export type Plano = {
  code: string; nome: string; max_animais: number; permite_estoque: boolean;
  permite_multiplos_responsaveis: boolean; animais_ativos: number;
};

export async function carregarPlano(): Promise<Plano | null> {
  const data = ok(await supabase.rpc("meu_plano")) as any[];
  return (data?.[0] as Plano) ?? null;
}

// Plano pago = qualquer plano diferente do gratuito
export const ehPago = (p: Plano | null | undefined) => !!p && p.code !== "gratis";

export async function carregarAnimais(somenteAtivos = true) {
  let q = supabase.from("animals").select("*").order("nome");
  if (somenteAtivos) q = q.eq("ativo", true);
  return ok(await q) ?? [];
}

// No plano grátis, o histórico mostra só os últimos 30 dias
export const DIAS_HISTORICO_GRATIS = 30;

// Hook genérico: carrega e permite recarregar
export function useCarga<T>(fn: () => Promise<T>, deps: any[] = []) {
  const [dados, setDados] = useState<T | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const pedido = useRef(0);
  const recarregar = useCallback(async () => {
    const meu = ++pedido.current;
    setCarregando(true);
    setErro(null);
    try {
      const r = await fn();
      if (meu === pedido.current) setDados(r);
    } catch (e: any) {
      if (meu === pedido.current) setErro("Não foi possível carregar. Confira a internet e toque em Tentar de novo.");
    } finally {
      if (meu === pedido.current) setCarregando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { recarregar(); }, [recarregar]);
  return { dados, carregando, erro, recarregar };
}

// Lança o erro da consulta (para a tela mostrar "sem conexão" em vez de "lista vazia")
export function ok<T>(res: { data: T | null; error: any }): T {
  if (res.error) throw res.error;
  return res.data as T;
}
