// Utilidades compartilhadas pelas funções de servidor do Caderno Equino
import Stripe from "npm:stripe@^18.0.0";
import { createClient } from "npm:@supabase/supabase-js@2";

export const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  httpClient: Stripe.createFetchHttpClient(),
});

export const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export const PLANOS_PAGOS = new Set([
  "basico_1", "basico_2", "basico_3", "basico_4", "pacote_5", "pacote_15", "pacote_40",
]);

// Portal do assinante criado no Stripe (área de testes). Em produção, definir STRIPE_PORTAL_CONFIG.
export const PORTAL_CONFIG = Deno.env.get("STRIPE_PORTAL_CONFIG") ?? "bpc_1UgDftKXfdro2IpWMtTMil8q";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export async function usuarioDaRequisicao(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function obterClienteStripe(userId: string, email?: string | null) {
  const { data: existente } = await admin
    .from("stripe_customers").select("stripe_customer_id").eq("user_id", userId).maybeSingle();
  if (existente) return existente.stripe_customer_id as string;

  const cliente = await stripe.customers.create(
    { email: email ?? undefined, metadata: { user_id: userId } },
    { idempotencyKey: `cliente-${userId}` },
  );
  await admin.from("stripe_customers")
    .upsert({ user_id: userId, stripe_customer_id: cliente.id }, { onConflict: "user_id", ignoreDuplicates: true });
  const { data: final } = await admin
    .from("stripe_customers").select("stripe_customer_id").eq("user_id", userId).single();
  return final!.stripe_customer_id as string;
}

// URL de retorno ao app depois do pagamento ou do portal
export function urlRetorno(destino: string | undefined, status: string) {
  const base = `${Deno.env.get("SUPABASE_URL")}/functions/v1/retorno`;
  const params = new URLSearchParams({ status });
  if (destino) params.set("destino", destino);
  return `${base}?${params.toString()}`;
}
