import { cor } from "./tema";

export const NOME_APP = "IAS Horse";

export type Opcao = { valor: string; rotulo: string; icone?: string; dica?: string };

// O que foi anotado. "cuidado_planejado" fica só para registros antigos: quem planeja usa a situação "Vou fazer".
// "algo_diferente" existe só na tela: grava "sinal_avaliacao_profissional" quando é para chamar o vet, senão "ocorrencia".
export const CATEGORIAS: Opcao[] = [
  { valor: "alimentacao", rotulo: "Comida", icone: "sack" },
  { valor: "agua", rotulo: "Água", icone: "water-outline" },
  { valor: "medicamento_suplemento", rotulo: "Remédio / vacina", icone: "needle" },
  { valor: "cascos", rotulo: "Cascos", icone: "horseshoe" },
  { valor: "escore_peso_medidas", rotulo: "Peso e corpo", icone: "scale-bathroom" },
  { valor: "dentes", rotulo: "Dentes", icone: "tooth-outline" },
  { valor: "exames", rotulo: "Exames e GTA", icone: "file-certificate-outline" },
  { valor: "reproducao", rotulo: "Reprodução", icone: "heart-outline" },
  { valor: "treino_amansamento", rotulo: "Treino e doma", icone: "run" },
  { valor: "comportamento", rotulo: "Comporta\u00ADmento", icone: "emoticon-outline" },
  { valor: "algo_diferente", rotulo: "Algo diferente", icone: "alert-outline" },
];
const CATEGORIAS_SO_LEITURA: Opcao[] = [
  { valor: "ocorrencia", rotulo: "Algo diferente", icone: "alert-outline" },
  { valor: "sinal_avaliacao_profissional", rotulo: "Sinal de alerta", icone: "alert-octagon-outline" },
];
const CATEGORIA_ANTIGA: Opcao = { valor: "cuidado_planejado", rotulo: "Cuidado planejado", icone: "calendar-check" };

/** Opções de toque para cada assunto (escrever fica opcional). Nada de nome de remédio: o app não indica tratamento. */
export type GrupoOpcoes = { rotulo: string; opcoes: string[]; uma?: boolean };
export const OPCOES_ANOTACAO: Record<string, GrupoOpcoes[]> = {
  alimentacao: [
    { rotulo: "O que deu", opcoes: ["Ração", "Feno", "Capim / pasto", "Silagem", "Milho / aveia", "Farelo", "Sal mineral", "Suplemento"] },
    { rotulo: "Como comeu", opcoes: ["Comeu tudo", "Deixou sobra", "Não quis comer"], uma: true },
    { rotulo: "Quando", opcoes: ["Manhã", "Tarde", "Noite"] },
  ],
  agua: [{ rotulo: "Água", opcoes: ["Água trocada", "Cocho lavado", "Bebeu bem", "Bebeu pouco", "Bebedouro sujo ou vazio", "Gengiva seca", "Prega de pele demorou"] }],
  medicamento_suplemento: [
    { rotulo: "O que foi", opcoes: ["Vacina", "Vermífugo", "Remédio da receita", "Suplemento", "Pomada / curativo"] },
    { rotulo: "Vacina (se for vacina)", opcoes: ["Influenza", "Tétano", "Encefalomielite", "Raiva", "Herpesvírus", "Outra"] },
  ],
  cascos: [
    { rotulo: "O que foi feito", opcoes: ["Limpeza", "Casqueamento", "Ferrageamento novo", "Troca de ferradura", "Reaproveitou ferradura", "Ferrageamento corretivo"] },
    { rotulo: "O que viu", opcoes: ["Perdeu ferradura", "Rachadura", "Cheiro ruim", "Casco quente", "Mancando"] },
    { rotulo: "Quais", opcoes: ["Mãos", "Pés", "Os 4"], uma: true },
  ],
  escore_peso_medidas: [],
  dentes: [
    { rotulo: "O que foi", opcoes: ["Avaliação do dentista", "Desgaste de pontas (grosa)"] },
    { rotulo: "O que viu", opcoes: ["Derruba comida", "Mastiga de lado", "Resiste ao freio", "Emagrecendo", "Mau cheiro na boca"] },
  ],
  exames: [
    { rotulo: "Exame ou documento", opcoes: ["Coleta AIE (anemia)", "Coleta Mormo", "AIE negativo", "Mormo negativo", "Aguardando resultado", "GTA emitida", "Coleta de fezes (OPG)"] },
    { rotulo: "Para quê", opcoes: ["Vaquejada", "Cavalgada", "Exposição", "Cobertura", "Venda", "Viagem"] },
  ],
  reproducao: [
    { rotulo: "O que aconteceu", opcoes: ["Cio observado", "Cobertura (monta)", "Inseminação", "Exame de prenhez", "Prenhez confirmada", "Vazia", "Parto"] },
    { rotulo: "No parto (regra 1-2-3)", opcoes: ["Potro de pé em 1 hora", "Mamou em 2 horas", "Placenta saiu em 3 horas", "Fez o mecônio"] },
  ],
  treino_amansamento: [
    { rotulo: "O que fez", opcoes: ["Guia / redondel", "Montado", "Passeio", "Doma", "Lida", "Descanso"] },
    { rotulo: "Quanto tempo", opcoes: ["15 min", "30 min", "1 hora", "Mais de 1 hora"], uma: true },
    { rotulo: "Como foi", opcoes: ["Foi bem", "Agitado", "Cansou rápido"], uma: true },
  ],
  comportamento: [{ rotulo: "Como está", opcoes: ["Calmo", "Agitado", "Parado / triste", "Bravo", "Não deixa pegar", "Isolado"] }],
  algo_diferente: [
    { rotulo: "O que viu", opcoes: ["Mancando", "Machucado / corte", "Inchaço", "Não comeu", "Olhando para a barriga", "Cavando o chão", "Deitando e rolando", "Suando parado", "Sem fezes", "Fezes moles", "Tosse / catarro", "Olho lacrimejando", "Febre"] },
  ],
};

/** Sugestão de quando lembrar de novo (o dono decide; nada vem marcado em remédio). */
export const DICA_INTERVALO: Record<string, string> = {
  cascos: "Ferrador costuma voltar a cada 35 a 45 dias.",
  dentes: "Dentista: pelo menos 1 vez por ano.",
  exames: "AIE e Mormo costumam valer 60 dias depois da coleta (confira a regra da ADAB).",
  medicamento_suplemento: "Use a data que o veterinário passou.",
};

export const LEMBRAR_DE_NOVO: Opcao[] = [
  { valor: "0", rotulo: "Não" }, { valor: "7", rotulo: "7 dias" }, { valor: "15", rotulo: "15 dias" }, { valor: "30", rotulo: "30 dias" },
  { valor: "45", rotulo: "45 dias" }, { valor: "60", rotulo: "60 dias" }, { valor: "90", rotulo: "3 meses" }, { valor: "180", rotulo: "6 meses" }, { valor: "365", rotulo: "1 ano" },
];

export const QUEM_FEZ = ["Eu", "Tratador", "Veterinário", "Ferrador", "Dentista"];

// Situação, em palavras do dia a dia (os valores do banco não mudam)
export const STATUS: (Opcao & { fundo: string; texto: string })[] = [
  { valor: "realizado", rotulo: "Feito", icone: "check-circle-outline", fundo: cor.mataClara, texto: cor.mata },
  { valor: "planejado", rotulo: "Vou fazer", icone: "clock-outline", fundo: cor.couroClaro, texto: cor.couro },
  { valor: "a_confirmar", rotulo: "Não sei ainda", icone: "help-circle-outline", fundo: cor.ouroClaro, texto: cor.ouro },
  { valor: "avaliacao_veterinaria", rotulo: "Chamar veterinário", icone: "stethoscope", fundo: cor.barroClaro, texto: cor.barro },
];

export const TIPOS_ESTOQUE: Opcao[] = [
  { valor: "racao", rotulo: "Ração", icone: "sack" },
  { valor: "silagem", rotulo: "Silagem", icone: "silo" },
  { valor: "volumoso", rotulo: "Feno ou capim", icone: "grass" },
  { valor: "suplemento", rotulo: "Sal ou suplemento", icone: "pill" },
  { valor: "outro", rotulo: "Outro", icone: "package-variant-closed" },
];

export const MOVIMENTOS: Opcao[] = [
  { valor: "compra_realizada", rotulo: "Comprei", icone: "check-circle-outline" },
  { valor: "consumo", rotulo: "Usei", icone: "minus-circle-outline" },
  { valor: "compra_planejada", rotulo: "Vou comprar", icone: "clock-outline" },
  { valor: "ajuste", rotulo: "Acertar estoque", icone: "help-circle-outline" },
];

export const RECORRENCIAS: Opcao[] = [
  { valor: "unica", rotulo: "Uma vez" },
  { valor: "diaria", rotulo: "Todo dia" },
  { valor: "semanal", rotulo: "Toda semana" },
  { valor: "quinzenal", rotulo: "A cada 15 dias" },
  { valor: "mensal", rotulo: "Todo mês" },
];

export const rotuloCategoria = (v: string) => rotuloCategoriaBruto(v).replace("\u00AD", "");
const rotuloCategoriaBruto = (v: string) =>
  [...CATEGORIAS, ...CATEGORIAS_SO_LEITURA, CATEGORIA_ANTIGA].find((c) => c.valor === v)?.rotulo ?? v;
export const iconeCategoria = (v: string) =>
  [...CATEGORIAS, ...CATEGORIAS_SO_LEITURA, CATEGORIA_ANTIGA].find((c) => c.valor === v)?.icone ?? "notebook-edit-outline";
export const infoStatus = (v: string) => STATUS.find((s) => s.valor === v) ?? STATUS[0];
export const rotuloDe = (lista: Opcao[], v: string) => lista.find((i) => i.valor === v)?.rotulo ?? v;

export const reais = (centavos: number | null | undefined) =>
  centavos == null ? "—" : (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const numBR = (n: number | null | undefined, casas = 1) =>
  n == null || !Number.isFinite(n) ? "—" : n.toLocaleString("pt-BR", { maximumFractionDigits: casas });

// Converte texto digitado ("12,5") em número; vazio = null; inválido = NaN
export function lerNumero(t: string): number | null {
  if (!t || !t.trim()) return null;
  let v = t.trim().replace(/\s/g, "");
  // "1.250,5" -> 1250.5 ; "2,5" -> 2.5 ; "2.5" -> 2.5
  if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/** Plural simples: plural(2, "saco") → "2 sacos" */
export function plural(n: number, um: string, varios?: string) {
  return `${numBR(n)} ${n === 1 ? um : varios ?? (um.endsWith("l") ? um.slice(0, -1) + "is" : um.endsWith("ão") ? um.slice(0, -2) + "ões" : um + "s")}`;
}
