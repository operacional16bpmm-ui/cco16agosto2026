import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_ESTADO_COP,
  ROTA_ACESSO_COP,
  gerarPkce,
  urlAutorizacao,
  urlDeRetorno,
} from "@/lib/cop2026-acesso";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const destino = request.nextUrl.searchParams.get("redirect") ?? "/cop2026/dashboard";

  try {
    const { verificador, desafio, estado } = await gerarPkce();
    const redirectUri = urlDeRetorno(request.nextUrl.origin);
    const resposta = NextResponse.redirect(urlAutorizacao({ redirectUri, estado, desafio }));

    /* Estado e verificador viajam em cookie de vida curta, não em sessão de
       servidor: o portal roda sem estado próprio e o handshake dura segundos.
       `sameSite: lax` é obrigatório aqui — o retorno vem de accounts.google.com
       e um cookie `strict` não seria enviado nesse salto. */
    resposta.cookies.set(COOKIE_ESTADO_COP, JSON.stringify({ estado, verificador, destino }), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
    return resposta;
  } catch (erro) {
    const url = new URL(ROTA_ACESSO_COP, request.nextUrl.origin);
    url.searchParams.set(
      "falha",
      erro instanceof Error ? erro.message : "Não foi possível iniciar a autenticação."
    );
    return NextResponse.redirect(url);
  }
}
