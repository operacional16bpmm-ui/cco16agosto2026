"use server";

import { redirect } from "next/navigation";
import { definirSessao, limparSessao } from "@/lib/auth-simples";
import { autenticar } from "@/lib/auth-usuarios";
import { rotaInicialPermitida } from "@/lib/db/permissoes";

export type LoginState = { error: string | null };

/**
 * Só aceita como destino pós-login um caminho interno de fato — nunca uma URL
 * absoluta nem protocol-relative ("//evil.example", que também "começa com
 * barra" e passaria numa checagem ingênua de startsWith("/")).
 */
function redirectInternoValido(destino: string): string | null {
  if (destino.startsWith("/") && !destino.startsWith("//") && !destino.includes("\\")) {
    return destino;
  }
  return null;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const usuario = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("password") ?? "");
  const destinoPedido = redirectInternoValido(String(formData.get("redirect") ?? ""));

  if (!usuario || !senha) {
    return { error: "Informe usuário institucional e senha." };
  }

  const resultado = await autenticar(usuario, senha);
  if (!resultado) {
    return { error: "Credenciais inválidas ou acesso não autorizado." };
  }

  await definirSessao(resultado.sessao);

  // Chave de acesso provisória entregue pelo Comando: antes de qualquer
  // página, o titular define a própria senha. O destino pedido se perde de
  // propósito; quem chega com senha provisória ainda não navegou nada.
  if (resultado.deveTrocarSenha) redirect("/trocar-senha");

  // Sem destino pedido (login direto, não redirecionado de uma rota
  // protegida), cada perfil cai onde trabalha: o Cmt de Cia no painel da sua
  // unidade, o Comando na visão geral e os demais na primeira página que o
  // Comando liberou para eles.
  redirect(destinoPedido ?? (await rotaInicialPermitida(resultado.sessao)));
}

export async function logoutAction() {
  await limparSessao();
  redirect("/login");
}
