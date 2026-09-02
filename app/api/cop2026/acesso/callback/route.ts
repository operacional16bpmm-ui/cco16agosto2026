import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_ACESSO_COP,
  COOKIE_ESTADO_COP,
  DURACAO_ACESSO_SEGUNDOS,
  ROTA_ACESSO_COP,
  assinarAcesso,
  trocarCodigoPorIdentidade,
  urlDeRetorno,
} from "@/lib/cop2026-acesso";
import { emailAutorizado } from "@/lib/db/cop2026-autorizados";

export const dynamic = "force-dynamic";

function recusar(request: NextRequest, params: Record<string, string>) {
  const url = new URL(ROTA_ACESSO_COP, request.nextUrl.origin);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const r = NextResponse.redirect(url);
  r.cookies.delete(COOKIE_ESTADO_COP);
  return r;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  // O usuário pode ter clicado em "cancelar" na tela do Google.
  if (sp.get("error")) {
    return recusar(request, { falha: "Autenticação cancelada no Google." });
  }

  const bruto = request.cookies.get(COOKIE_ESTADO_COP)?.value;
  if (!bruto) {
    return recusar(request, { falha: "A tentativa de acesso expirou. Comece de novo." });
  }

  let estadoGravado: { estado: string; verificador: string; destino: string };
  try {
    estadoGravado = JSON.parse(bruto);
  } catch {
    return recusar(request, { falha: "Estado de autenticação ilegível." });
  }

  /* Sem esta comparação, um link forjado poderia fazer o navegador de um
     autorizado completar um login que ele não pediu (CSRF de login). */
  if (!sp.get("state") || sp.get("state") !== estadoGravado.estado) {
    return recusar(request, { falha: "Estado de autenticação não confere." });
  }

  const codigo = sp.get("code");
  if (!codigo) return recusar(request, { falha: "O Google não devolveu o código." });

  try {
    const identidade = await trocarCodigoPorIdentidade(
      codigo,
      estadoGravado.verificador,
      urlDeRetorno(request.nextUrl.origin)
    );

    if (!identidade.emailVerificado) {
      return recusar(request, { negado: identidade.email, motivo: "nao-verificado" });
    }

    const destino = estadoGravado.destino.startsWith("/cop2026/")
      ? estadoGravado.destino
      : "/cop2026/dashboard";

    /* A lista de autorizados é o gate do COMANDO, não da tropa.
     *
     * O lançamento (`/cop2026/lancar`) é da tropa inteira — 570 policiais que
     * nunca estarão nas 22 contas escolhidas a dedo para o Dashboard. Recusar
     * aqui trancaria o formulário justamente para quem ele existe.
     *
     * Emitir o cookie para qualquer conta Google verificada é seguro porque a
     * autorização NUNCA dependeu deste cookie: toda superfície restrita
     * recheca a lista por requisição em sessaoCop() — dashboard, briefing,
     * relatórios, admin e o PNG do briefing. O cookie diz "esta identidade foi
     * verificada pelo Google"; quem diz "esta pessoa pode ver" é a página. É
     * essa recheca que também faz a revogação valer na hora, sem esperar o
     * cookie de 12h vencer.
     */
    const soIdentidade = destino.startsWith("/cop2026/lancar");
    if (!soIdentidade && !(await emailAutorizado(identidade.email))) {
      return recusar(request, { negado: identidade.email });
    }
    const resposta = NextResponse.redirect(new URL(destino, request.nextUrl.origin));
    resposta.cookies.set(COOKIE_ACESSO_COP, await assinarAcesso(identidade.email, identidade.nome), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: DURACAO_ACESSO_SEGUNDOS,
    });
    resposta.cookies.delete(COOKIE_ESTADO_COP);
    return resposta;
  } catch (erro) {
    return recusar(request, {
      falha: erro instanceof Error ? erro.message : "Falha ao concluir a autenticação.",
    });
  }
}
