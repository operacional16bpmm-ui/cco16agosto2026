import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com service role — SOMENTE para ingestão do coletor no servidor.
 * Nunca importar em código de cliente. A service key vive só em variável de
 * ambiente do servidor.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey)
    throw new Error("Configuração de ingestão do coletor indisponível.");

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
