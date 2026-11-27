// Despertadores do IAS Horse: agenda avisos no próprio celular (Android/iOS).
// No site (web) não há despertador; os lembretes de hoje aparecem no Início.
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { supabase } from "./supabase";
import { hojeISO, somarDias, deISO } from "./datas";

export type Lembrete = {
  id: string; animal_id: string | null; tipo: string; titulo: string; horarios: string[]; dias_semana: number[] | null;
  data_inicio: string; data_fim: string | null; stock_item_id: string | null; task_id: string | null; ativo: boolean;
  antecedencia_dias: number; animals?: { nome: string } | null;
};

export const TIPOS_LEMBRETE = [
  { valor: "alimentacao", rotulo: "Comida", icone: "barley" },
  { valor: "agua", rotulo: "Água", icone: "water-outline" },
  { valor: "remedio", rotulo: "Remédio (receita do vet)", icone: "pill" },
  { valor: "tarefa", rotulo: "Tarefa", icone: "calendar-check" },
  { valor: "reposicao", rotulo: "Comprar de novo", icone: "cart-outline" },
  { valor: "outro", rotulo: "Outro", icone: "bell-outline" },
];
export const iconeLembrete = (t: string) => TIPOS_LEMBRETE.find((x) => x.valor === t)?.icone ?? "bell-outline";

export const HORARIOS_PRONTOS = ["05:00", "06:00", "07:00", "11:00", "12:00", "16:00", "17:00", "18:00", "20:00"];
export const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const LIMITE = 60; // o iPhone guarda no máximo 64 avisos agendados
const DIAS_A_FRENTE = 14;
export const temDespertador = Platform.OS !== "web";

let configurado = false;
async function configurar() {
  if (configurado || !temDespertador) return;
  configurado = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("lembretes", {
      name: "Lembretes do manejo", importance: Notifications.AndroidImportance.HIGH, sound: "default", vibrationPattern: [0, 400, 200, 400],
    });
  }
}

/** Pede permissão (só quando a pessoa cria o primeiro lembrete). */
export async function pedirPermissao(): Promise<boolean> {
  if (!temDespertador) return false;
  await configurar();
  const atual = await Notifications.getPermissionsAsync();
  if (atual.granted || atual.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return true;
  const novo = await Notifications.requestPermissionsAsync();
  return novo.granted;
}

const hm = (h: string) => { const [a, b] = h.split(":").map(Number); return { hour: a, minute: b }; };
function dataHora(iso: string, h: string) { const d = deISO(iso); const { hour, minute } = hm(h); d.setHours(hour, minute, 0, 0); return d; }

/** Quais horários de um lembrete valem hoje (para a lista "Hoje" e para marcar Feito). */
export function horariosDeHoje(l: Lembrete, hoje = hojeISO()): string[] {
  if (!l.ativo || l.tipo === "reposicao" || l.tipo === "tarefa") return [];
  if (l.data_inicio > hoje || (l.data_fim && l.data_fim < hoje)) return [];
  if (l.dias_semana?.length && !l.dias_semana.includes(deISO(hoje).getDay())) return [];
  return [...l.horarios].sort();
}

type Aviso = { quando: Date | null; gatilho: Notifications.NotificationTriggerInput; titulo: string; corpo: string; dados: Record<string, unknown> };

/** Recria todos os avisos do celular a partir dos lembretes guardados. Chame ao abrir o app e depois de mudar um lembrete. */
export async function sincronizarLembretes(): Promise<{ agendados: number; permitido: boolean }> {
  if (!temDespertador) return { agendados: 0, permitido: false };
  await configurar();
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return { agendados: 0, permitido: false };

  const hoje = hojeISO();
  const [{ data: lembretes }, { data: previsao }, { data: tarefas }] = await Promise.all([
    supabase.from("lembretes").select("*, animals(nome)").eq("ativo", true),
    supabase.rpc("previsao_estoque"),
    supabase.from("tasks").select("id,titulo,proxima_data,ativo").eq("ativo", true),
  ]);
  const avisos: Aviso[] = [];
  const agora = new Date();
  const canal = Platform.OS === "android" ? { channelId: "lembretes" } : {};

  for (const l of (lembretes ?? []) as Lembrete[]) {
    const quem = l.animals?.nome ? ` — ${l.animals.nome}` : "";
    const dados = { lembrete_id: l.id, tipo: l.tipo };
    if (l.tipo === "reposicao") {
      const p = (previsao ?? []).find((x: any) => x.item_id === l.stock_item_id);
      if (!p?.acaba_em) continue;
      const dia = somarDias(p.acaba_em, -Math.max(l.antecedencia_dias || 3, 0));
      const quando = dataHora(dia < hoje ? hoje : dia, l.horarios[0] ?? "08:00");
      if (quando <= agora) quando.setTime(agora.getTime() + 60_000 * 60); // já está perto: avisa daqui a 1 hora
      avisos.push({ quando, gatilho: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: quando, ...canal },
        titulo: `Comprar ${p.nome}`, corpo: `Deve acabar perto de ${p.acaba_em.split("-").reverse().join("/")}.`, dados });
      continue;
    }
    if (l.tipo === "tarefa") {
      const t = (tarefas ?? []).find((x: any) => x.id === l.task_id);
      if (!t?.proxima_data) continue;
      const dia = somarDias(t.proxima_data, -(l.antecedencia_dias || 0));
      const quando = dataHora(dia, l.horarios[0] ?? "07:00");
      if (quando <= agora) continue;
      avisos.push({ quando, gatilho: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: quando, ...canal },
        titulo: l.titulo, corpo: l.antecedencia_dias ? `Daqui a ${l.antecedencia_dias} dia(s).` : `Hoje${quem}.`, dados });
      continue;
    }
    const corpo = `${l.tipo === "remedio" ? "Conforme a receita do veterinário" : "Toque para marcar como feito"}${quem}.`;
    const semFim = !l.data_fim && l.data_inicio <= hoje;
    for (const h of l.horarios) {
      if (semFim && !l.dias_semana?.length) {
        avisos.push({ quando: null, gatilho: { type: Notifications.SchedulableTriggerInputTypes.DAILY, ...hm(h), ...canal }, titulo: l.titulo, corpo, dados: { ...dados, horario: h } });
      } else if (semFim) {
        for (const d of l.dias_semana!) {
          avisos.push({ quando: null, gatilho: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: d + 1, ...hm(h), ...canal }, titulo: l.titulo, corpo, dados: { ...dados, horario: h } });
        }
      } else {
        // com data de início/fim (ex.: remédio por 7 dias): um aviso por dia nos próximos 14 dias
        for (let n = 0; n < DIAS_A_FRENTE; n++) {
          const dia = somarDias(hoje, n);
          if (dia < l.data_inicio || (l.data_fim && dia > l.data_fim)) continue;
          if (l.dias_semana?.length && !l.dias_semana.includes(deISO(dia).getDay())) continue;
          const quando = dataHora(dia, h);
          if (quando <= agora) continue;
          avisos.push({ quando, gatilho: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: quando, ...canal }, titulo: l.titulo, corpo, dados: { ...dados, horario: h } });
        }
      }
    }
  }

  // os repetidos (diário/semanal) primeiro, depois as datas mais próximas
  avisos.sort((a, b) => (a.quando ? a.quando.getTime() : 0) - (b.quando ? b.quando.getTime() : 0));
  await Notifications.cancelAllScheduledNotificationsAsync();
  let n = 0;
  for (const a of avisos.slice(0, LIMITE)) {
    try {
      await Notifications.scheduleNotificationAsync({ content: { title: a.titulo, body: a.corpo, data: a.dados, sound: "default" }, trigger: a.gatilho });
      n++;
    } catch (e) { console.warn("aviso", e); }
  }
  return { agendados: n, permitido: true };
}

/** Ouve o toque no aviso e chama abrir(lembreteId, horario). Devolve a função para parar de ouvir. */
export function ouvirToques(abrir: (lembreteId: string, horario: string, tipo: string) => void) {
  if (!temDespertador) return () => {};
  const tratar = (r: Notifications.NotificationResponse | null) => {
    const d: any = r?.notification.request.content.data;
    if (d?.lembrete_id) abrir(String(d.lembrete_id), String(d.horario ?? ""), String(d.tipo ?? ""));
  };
  Notifications.getLastNotificationResponseAsync().then((r) => { tratar(r); Notifications.clearLastNotificationResponseAsync?.(); }).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(tratar);
  return () => sub.remove();
}
