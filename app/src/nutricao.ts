// Cálculo da dieta: só soma e compara com faixas de referência publicadas.
// Não recomenda dieta, ração ou remédio. Valores de referência em REFERENCIAS (com fontes).
import type { Opcao } from "./constantes";

export type TipoDieta =
  | "feno" | "capim_verde" | "silagem" | "racao" | "grao" | "farelo" | "sal_mineral" | "sal_comum" | "suplemento" | "outro";

export const TIPOS_DIETA: (Opcao & { valor: TipoDieta; ms: number | null; grupo: "volumoso" | "concentrado" | "sal" | "outro" })[] = [
  { valor: "feno", rotulo: "Feno", icone: "grass", ms: 88, grupo: "volumoso" },
  { valor: "capim_verde", rotulo: "Capim verde", icone: "grass", ms: 22, grupo: "volumoso" },
  { valor: "silagem", rotulo: "Silagem", icone: "silo", ms: 32, grupo: "volumoso" },
  { valor: "racao", rotulo: "Ração", icone: "sack", ms: 89, grupo: "concentrado" },
  { valor: "grao", rotulo: "Milho ou aveia", icone: "corn", ms: 88, grupo: "concentrado" },
  { valor: "farelo", rotulo: "Farelo", icone: "grain", ms: 87, grupo: "concentrado" },
  { valor: "sal_mineral", rotulo: "Sal mineral", icone: "shaker-outline", ms: 100, grupo: "sal" },
  { valor: "sal_comum", rotulo: "Sal comum", icone: "shaker-outline", ms: 100, grupo: "sal" },
  { valor: "suplemento", rotulo: "Suplemento", icone: "bottle-tonic-outline", ms: 90, grupo: "outro" },
  { valor: "outro", rotulo: "Outro", icone: "dots-horizontal", ms: null, grupo: "outro" },
];

export const infoTipoDieta = (v: string) => TIPOS_DIETA.find((t) => t.valor === v) ?? TIPOS_DIETA[TIPOS_DIETA.length - 1];

// Faixas de referência para cavalo adulto em manutenção ou trabalho leve (ver FONTES)
export const REFERENCIAS = {
  msTotalUsual: [2, 2.5] as [number, number], // % do peso vivo por dia, matéria seca (faixa usual)
  msTotalMin: 1.25, // nunca abaixo disso, nem em dieta para emagrecer
  msTotalMax: 3, // perto do máximo que o cavalo consegue comer
  volumosoMin: 1.5, // % do peso vivo em matéria seca de volumoso (feno, capim, silagem)
  volumosoMinParteDieta: 50, // volumoso deve ser pelo menos metade do total
  concentradoPorRefeicaoMax: 0.5, // % do peso vivo por refeição (ração/grão como fornecido)
  aguaLitrosPor100kg: [5, 8] as [number, number], // litros por 100 kg por dia, clima ameno e pouco trabalho
  salGramasDia: [20, 40] as [number, number], // sal comum por dia para ~500 kg em manutenção; mais com suor
  fitaMargem: 10, // a estimativa pela fita pode errar cerca de 10%
  fontes: [
    "MSD/Merck Veterinary Manual — Feeding practices in horses; Nutritional requirements of horses (baseado no NRC 2007).",
    "University of Minnesota Extension — Carbohydrates and fats in your horse's diet.",
    "Kentucky Equine Research — Sodium, potassium and chloride.",
    "Feedipedia (INRAE/CIRAD/AFZ/FAO) e Embrapa — matéria seca dos alimentos.",
    "Ontario OMAFRA — Estimating body weight of horses.",
  ],
};

// Cuidados gerais que o app apenas informa
export const CUIDADOS = {
  mudanca: "Mudanças na alimentação devem ser feitas aos poucos, ao longo de vários dias.",
  mofo: "Feno ou silagem com mofo não deve ser dado ao cavalo.",
  silagem: "Silagem tem risco de botulismo para cavalos. Converse com o veterinário antes de usar.",
  agua: "Água limpa à vontade o tempo todo. No calor e no trabalho o cavalo bebe bem mais.",
  minerais: "Sal mineral e suplementos: siga a dose da embalagem ou do veterinário.",
};

export type ItemDieta = {
  id?: string; nome: string; tipo: string; quantidade: number; unidade: "kg" | "g"; refeicoes: number;
  materia_seca_pct?: number | null;
};

export type Situacao = "abaixo" | "dentro" | "acima" | "sem_peso" | "incompleto";

export type ResultadoDieta = {
  naturalKg: number; msKg: number; msSemDado: string[];
  volumosoMsKg: number; volumosoParteDieta: number | null; concentradoKgDia: number; concentradoMaiorRefeicaoKg: number;
  salG: number; salComumG: number; salMineralG: number;
  pesoKg: number | null;
  msPctPV: number | null; volumosoPctPV: number | null; refeicaoPctPV: number | null;
  situacaoMs: Situacao; situacaoVolumoso: Situacao; situacaoRefeicao: Situacao;
  aguaLitros: [number, number] | null;
};

export function kgDia(i: ItemDieta) {
  return i.unidade === "g" ? i.quantidade / 1000 : i.quantidade;
}

export function calcularDieta(itens: ItemDieta[], pesoKg: number | null): ResultadoDieta {
  let naturalKg = 0, msKg = 0, volumosoMsKg = 0, concentradoKgDia = 0, concentradoMaiorRefeicaoKg = 0, salComumG = 0, salMineralG = 0;
  const msSemDado: string[] = [];
  for (const i of itens) {
    const kg = kgDia(i);
    const t = infoTipoDieta(i.tipo);
    const msPct = i.materia_seca_pct ?? t.ms;
    naturalKg += kg;
    if (msPct == null) msSemDado.push(i.nome);
    const ms = msPct == null ? 0 : kg * (msPct / 100);
    msKg += ms;
    if (t.grupo === "volumoso") volumosoMsKg += ms;
    if (t.grupo === "concentrado") {
      concentradoKgDia += kg;
      // supõe que os concentrados vão juntos no cocho: soma a porção de cada um por refeição
      concentradoMaiorRefeicaoKg += kg / Math.max(1, i.refeicoes);
    }
    if (i.tipo === "sal_comum") salComumG += kg * 1000;
    if (i.tipo === "sal_mineral") salMineralG += kg * 1000;
  }
  const salG = salComumG + salMineralG;

  const temPeso = !!pesoKg && pesoKg > 0;
  const pct = (v: number) => (temPeso ? (v / (pesoKg as number)) * 100 : null);
  const msPctPV = pct(msKg), volumosoPctPV = pct(volumosoMsKg), refeicaoPctPV = pct(concentradoMaiorRefeicaoKg);
  const faixa = (v: number | null, min?: number, max?: number): Situacao =>
    v == null ? "sem_peso" : min != null && v < min ? "abaixo" : max != null && v > max ? "acima" : "dentro";
  const incompleto = msSemDado.length > 0;
  const volumosoParteDieta = msKg > 0 ? (volumosoMsKg / msKg) * 100 : null;
  let situacaoVolumoso: Situacao = incompleto ? "incompleto" : faixa(volumosoPctPV, REFERENCIAS.volumosoMin);
  if (situacaoVolumoso === "dentro" && volumosoParteDieta != null && volumosoParteDieta < REFERENCIAS.volumosoMinParteDieta) situacaoVolumoso = "abaixo";

  return {
    naturalKg, msKg, msSemDado, volumosoMsKg, volumosoParteDieta, concentradoKgDia, concentradoMaiorRefeicaoKg, salG, salComumG, salMineralG,
    pesoKg: temPeso ? pesoKg : null,
    msPctPV, volumosoPctPV, refeicaoPctPV,
    situacaoMs: incompleto ? "incompleto" : faixa(msPctPV, REFERENCIAS.msTotalUsual[0], REFERENCIAS.msTotalUsual[1]),
    situacaoVolumoso,
    situacaoRefeicao: concentradoKgDia === 0 ? "dentro" : faixa(refeicaoPctPV, undefined, REFERENCIAS.concentradoPorRefeicaoMax),
    aguaLitros: temPeso
      ? [Math.round((pesoKg as number) / 100 * REFERENCIAS.aguaLitrosPor100kg[0]), Math.round((pesoKg as number) / 100 * REFERENCIAS.aguaLitrosPor100kg[1])]
      : null,
  };
}

// Peso estimado pela fita (perímetro do peito e comprimento do corpo, em cm)
export const DIVISOR_FITA = 11900; // Carroll & Huntington, usado pelo OMAFRA (Ontário)
export function pesoPelaFita(perimetroCm: number, comprimentoCm: number) {
  if (!(perimetroCm > 0) || !(comprimentoCm > 0)) return null;
  return Math.round((perimetroCm * perimetroCm * comprimentoCm) / DIVISOR_FITA);
}
