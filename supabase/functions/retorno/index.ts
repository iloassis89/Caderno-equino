// Devolve o usuário ao app depois do Stripe (Checkout ou portal).
// Só redireciona para destinos permitidos, para evitar uso indevido do link.
const PADRAO = "iashorse://assinatura";

function permitido(destino: string) {
  if (destino.startsWith("iashorse://") || destino.startsWith("cadernoequino://")) return true;
  if (destino.startsWith("exp://")) return true; // testes com Expo Go
  try {
    const u = new URL(destino);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return true;
    if (u.origin === "https://iloassis89.github.io") return true; // app web publicado
    const extras = (Deno.env.get("APP_WEB_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    return extras.includes(u.origin);
  } catch {
    return false;
  }
}

Deno.serve((req) => {
  const url = new URL(req.url);
  const status = (url.searchParams.get("status") ?? "ok").replace(/[^a-z_]/gi, "");
  const destino = url.searchParams.get("destino") ?? "";
  const base = destino && permitido(destino) ? destino : PADRAO;
  const sep = base.includes("?") ? "&" : "?";
  return new Response(null, { status: 302, headers: { Location: `${base}${sep}status=${status}` } });
});
