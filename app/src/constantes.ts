import { cor } from "./tema";

export const CATEGORIAS: { valor: string; rotulo: string }[] = [
  { valor: "alimentacao", rotulo: "Alimentação" },
  { valor: "agua", rotulo: "Água" },
  { valor: "cascos", rotulo: "Cascos" },
  { valor: "medicamento_suplemento", rotulo: "Medicamento/suplemento dado" },
  { valor: "cuidado_planejado", rotulo: "Cuidado planejado" },
  { valor: "comportamento", rotulo: "Comportamento" },
  { valor: "escore_peso_medidas", rotulo: "Escore, peso e medidas" },
  { valor: "treino_amansamento", rotulo: "Treino e amansamento" },
  { valor: "ocorrencia", rotulo: "Ocorrência" },
  { valor: "sinal_avaliacao_profissional", rotulo: "Sinal p/ avaliação profissional" },
];

export const STATUS: { valor: string; rotulo: string; fundo: string; texto: string }[] = [
  { valor: "realizado", rotulo: "Realizado", fundo: cor.mataClara, texto: cor.mata },
  { valor: "planejado", rotulo: "Planejado", fundo: cor.couroClaro, texto: cor.couro },
  { valor: "a_confirmar", rotulo: "A confirmar", fundo: "#EFE6C6", texto: "#6B5414" },
  { valor: "avaliacao_veterinaria", rotulo: "Avaliação veterinária", fundo: cor.barroClaro, texto: cor.barro },
];

export const TIPOS_ESTOQUE = [
  { valor: "racao", rotulo: "Ração" },
  { valor: "silagem", rotulo: "Silagem" },
  { valor: "volumoso", rotulo: "Volumoso" },
  { valor: "suplemento", rotulo: "Suplemento" },
  { valor: "outro", rotulo: "Outro" },
];

export const MOVIMENTOS = [
  { valor: "compra_planejada", rotulo: "Compra planejada" },
  { valor: "compra_realizada", rotulo: "Compra feita" },
  { valor: "consumo", rotulo: "Consumo" },
  { valor: "ajuste", rotulo: "Ajuste de saldo" },
];

export const RECORRENCIAS = [
  { valor: "unica", rotulo: "Uma vez" },
  { valor: "diaria", rotulo: "Diária" },
  { valor: "semanal", rotulo: "Semanal" },
  { valor: "quinzenal", rotulo: "Quinzenal" },
  { valor: "mensal", rotulo: "Mensal" },
];

export const rotuloCategoria = (v: string) => CATEGORIAS.find((c) => c.valor === v)?.rotulo ?? v;
export const infoStatus = (v: string) => STATUS.find((s) => s.valor === v) ?? STATUS[0];
export const rotuloDe = (lista: { valor: string; rotulo: string }[], v: string) =>
  lista.find((i) => i.valor === v)?.rotulo ?? v;

export const reais = (centavos: number | null | undefined) =>
  centavos == null ? "—" : (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
