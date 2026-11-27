// Datas: o app mostra DD/MM/AAAA e grava AAAA-MM-DD
export function hojeISO() {
  const d = new Date();
  return isoDe(d);
}

export function isoDe(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dia}`;
}

export function deISO(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d);
}

export function br(iso?: string | null) {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

// Aceita DD/MM/AAAA; devolve ISO ou null se inválida
export function paraISO(texto: string): string | null {
  const t = texto.trim();
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  if (d.getDate() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1) return null;
  return isoDe(d);
}

// Máscara simples enquanto digita
export function mascaraData(t: string) {
  const n = t.replace(/\D/g, "").slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
}

export function somarDias(iso: string, dias: number) {
  const d = deISO(iso);
  d.setDate(d.getDate() + dias);
  return isoDe(d);
}

// Semana de segunda a domingo que contém a data
export function semanaDe(iso: string) {
  const d = deISO(iso);
  const dow = (d.getDay() + 6) % 7; // 0 = segunda
  const inicio = somarDias(iso, -dow);
  return { inicio, fim: somarDias(inicio, 6) };
}

export function proximaData(iso: string, recorrencia: string, intervalo = 1) {
  switch (recorrencia) {
    case "diaria": return somarDias(iso, 1 * intervalo);
    case "semanal": return somarDias(iso, 7 * intervalo);
    case "quinzenal": return somarDias(iso, 14 * intervalo);
    case "mensal": {
      const d = deISO(iso);
      d.setMonth(d.getMonth() + intervalo);
      return isoDe(d);
    }
    default: return null;
  }
}
