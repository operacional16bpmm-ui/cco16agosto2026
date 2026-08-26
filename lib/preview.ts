/** Detecta se o Supabase está configurado (fora do modo prévia). */
export function supabaseConfigurado() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && !url.includes("seu-projeto") && url.startsWith("http"));
}
