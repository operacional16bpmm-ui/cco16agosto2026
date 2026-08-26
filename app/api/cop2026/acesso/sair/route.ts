import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ACESSO_COP, ROTA_ACESSO_COP } from "@/lib/cop2026-acesso";

export const dynamic = "force-dynamic";

/** GET para o link funcionar sem JavaScript — a saída é uma ação idempotente
 *  que só apaga cookie, não muda dado do Batalhão. */
export async function GET(request: NextRequest) {
  const url = new URL(ROTA_ACESSO_COP, request.nextUrl.origin);
  url.searchParams.set("saiu", "1");
  const r = NextResponse.redirect(url);
  r.cookies.delete(COOKIE_ACESSO_COP);
  return r;
}
