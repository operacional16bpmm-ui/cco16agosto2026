import { NextResponse } from "next/server";

import { exigirAdminCop } from "@/lib/db/cop2026-autorizados";
import { medirSaude } from "@/lib/cop2026-saude";

/**
 * A MESMA medição da rota do vigia, mas atrás do cookie de admin — é o que a
 * tela `/cop2026/admin/saude` usa para se atualizar sozinha.
 *
 * Existe separada porque as duas portas têm chaves diferentes: o vigia é uma
 * máquina e carrega um bearer; o administrador é uma pessoa e carrega a sessão
 * do Google. Uma rota só com dois gates aceitaria o bearer vindo do navegador,
 * e o token acabaria no JavaScript da página.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 25;

export async function GET() {
  await exigirAdminCop();
  const retrato = await medirSaude();
  return NextResponse.json(retrato, { headers: { "cache-control": "no-store" } });
}
