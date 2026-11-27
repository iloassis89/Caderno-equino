import { cor } from "./tema";

export const NOME_APP = "IAS Horse";

export type Opcao = { valor: string; rotulo: string; icone?: string; dica?: string };

// O que foi anotado. "cuidado_planejado" fica só para registros antigos: quem planeja usa a situação "Vou fazer".
export const CATEGORIAS: Opcao[] = [
  { valor: "alimentacao", rotulo: "Comida", icone: "barley" },
  { valor: "agua", rotulo: "Água", icone: "water-outline" },
  { valor: "cascos", rotulo: "Cascos", icone: "horseshoe" },
  { valor: "medicamento_suplemento", rotulo: "Remédio ou suplemento dado", icone: "pill" },
  { valor: "escore_peso_medidas", rotulo: "Peso e corpo", icone: "scale-bathroom" },
  { valor: "treino_amansamento", rotulo: "Treino e doma", icone: "run" },
  { valor: "comportamento", rotulo: "Comportamento", icone: "emoticon-outline" },
  { valor: "ocorrencia", rotulo: "Aconteceu algo", icone: "alert-outline" },
  { valor: "sinal_avaliacao_profissional", rotulo: "Sinal de alerta", icone: "alert-octagon-outline" },
];
const CATEGORIA_ANTIGA: Opcao = { valor: "cuidado_planejado", rotulo: "Cuidado planejado", icone: "calendar-check" };

// Situação, em palavras do dia a dia (os valores do banco não mudam)
export const STATUS: (Opcao & { fundo: string; texto: string })[] = [
  { valor: "realizado", rotulo: "Feito", icone: "check-circle-outline", fundo: cor.mataClara, texto: cor.mata },
  { valor: "planejado", rotulo: "Vou fazer", icone: "clock-outline", fundo: cor.couroClaro, texto: cor.couro },
  { valor: "a_confirmar", rotulo: "Confirmar depois", icone: "help-circle-outline", fundo: cor.ouroClaro, texto: cor.ouro },
  { valor: "avaliacao_veterinaria", rotulo: "Chamar veterinário", icone: "stethoscope", fundo: cor.barroClaro, texto: cor.barro },
];

export const TIPOS_ESTOQUE: Opcao[] = [
  { valor: "racao", rotulo: "Ração", icone: "barley" },
  { valor: "silagem", rotulo: "Silagem", icone: "barley" },
  { valor: "volumoso", rotulo: "Feno ou capim", icone: "barley" },
  { valor: "suplemento", rotulo: "Sal ou suplemento", icone: "pill" },
  { valor: "outro", rotulo: "Outro", icone: "package-variant-closed" },
];

export const MOVIMENTOS: Opcao[] = [
  { valor: "compra_realizada", rotulo: "Comprei", icone: "check-circle-outline" },
  { valor: "consumo", rotulo: "Usei", icone: "barley" },
  { valor: "compra_planejada", rotulo: "Vou comprar", icone: "clock-outline" },
  { valor: "ajuste", rotulo: "Corrigir quantidade", icone: "help-circle-outline" },
];

export const RECORRENCIAS: Opcao[] = [
  { valor: "unica", rotulo: "Uma vez" },
  { valor: "diaria", rotulo: "Todo dia" },
  { valor: "semanal", rotulo: "Toda semana" },
  { valor: "quinzenal", rotulo: "A cada 15 dias" },
  { valor: "mensal", rotulo: "Todo mês" },
];

export const rotuloCategoria = (v: string) =>
  [...CATEGORIAS, CATEGORIA_ANTIGA].find((c) => c.valor === v)?.rotulo ?? v;
export const iconeCategoria = (v: string) =>
  [...CATEGORIAS, CATEGORIA_ANTIGA].find((c) => c.valor === v)?.icone ?? "notebook-edit-outline";
export const infoStatus = (v: string) => STATUS.find((s) => s.valor === v) ?? STATUS[0];
export const rotuloDe = (lista: Opcao[], v: string) => lista.find((i) => i.valor === v)?.rotulo ?? v;

export const reais = (centavos: number | null | undefined) =>
  centavos == null ? "—" : (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const numBR = (n: number | null | undefined, casas = 1) =>
  n == null || !Number.isFinite(n) ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: casas });

// Converte texto digitado ("12,5") em número; vazio = null; inválido = NaN
export function lerNumero(t: string): number | null {
  if (!t || !t.trim()) return null;
  const n = Number(t.trim().replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}
