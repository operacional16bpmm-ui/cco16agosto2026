import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/preview";
import { comparacaoConstante, type Perfil, type Sessao } from "@/lib/auth-simples";
import { ehUnidadeValida, type Unidade } from "@/lib/unidades";

/**
 * Autenticação contra public.usuarios_portal (migration 019). Separado de
 * lib/auth-simples.ts porque aquele módulo roda também na borda (proxy.ts) e
 * não pode arrastar o cliente Supabase para o bundle do middleware.
 *
 * Fail-closed em toda falha: banco fora do ar, usuário inativo, hash que não
 * confere, tudo devolve null e o login recusa. Nunca há "senha padrão".
 */

export const ITERACOES_PADRAO = 210_000;

function bufferParaHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** PBKDF2-SHA256 (Web Crypto, sem dependência nova). Usado no login e no
 * script de cadastro, para os dois lados nunca divergirem de parâmetros. */
export async function derivarSenha(
  senha: string,
  saltHex: string,
  iteracoes = ITERACOES_PADRAO
): Promise<string> {
  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(senha),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const salt = Uint8Array.from(saltHex.match(/.{2}/g) ?? [], (b) => parseInt(b, 16));
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: iteracoes, hash: "SHA-256" },
    chave,
    256
  );
  return bufferParaHex(bits);
}

type LinhaUsuario = {
  usuario: string;
  senha_hash: string;
  senha_salt: string;
  iteracoes: number;
  nome_exibicao: string;
  perfil: string;
  unidade: string | null;
  ativo: boolean;
  sessao_versao: number;
  deve_trocar_senha: boolean;
};

export type ResultadoLogin = {
  sessao: Sessao;
  /** Senha provisória gerada pelo Comando: o login intercepta e obriga a troca. */
  deveTrocarSenha: boolean;
};

/**
 * Conta de emergência do Comando: as variáveis CCO16_USUARIO/CCO16_SENHA que
 * já existiam continuam valendo, para não haver cenário em que uma falha no
 * banco tranque todo mundo para fora do portal. Sem as variáveis definidas,
 * esse caminho simplesmente não existe (não há valor padrão).
 */
function credencialDeEmergencia(usuario: string, senha: string): ResultadoLogin | null {
  const usuarioEnv = process.env.CCO16_USUARIO?.toLowerCase();
  const senhaEnv = process.env.CCO16_SENHA;
  if (!usuarioEnv || !senhaEnv) return null;
  if (usuario.trim().toLowerCase() !== usuarioEnv) return null;
  if (!comparacaoConstante(senha, senhaEnv)) return null;
  return {
    sessao: { usuario: usuarioEnv, nome: "Comando (acesso de emergência)", perfil: "comando", unidade: null },
    deveTrocarSenha: false,
  };
}

/** Valida usuário e senha; devolve a sessão a gravar no cookie, ou null. */
export async function autenticar(usuario: string, senha: string): Promise<ResultadoLogin | null> {
  const login = usuario.trim().toLowerCase();

  if (supabaseConfigurado()) {
    try {
      const c = createAdminClient();
      const { data, error } = await c
        .from("usuarios_portal")
        .select(
          "usuario, senha_hash, senha_salt, iteracoes, nome_exibicao, perfil, unidade, ativo, sessao_versao, deve_trocar_senha"
        )
        .eq("usuario", login)
        .maybeSingle<LinhaUsuario>();

      if (error) throw new Error(error.message);

      if (data && data.ativo) {
        const derivada = await derivarSenha(senha, data.senha_salt, data.iteracoes);
        if (comparacaoConstante(derivada, data.senha_hash)) {
          await c
            .from("usuarios_portal")
            .update({ ultimo_acesso_em: new Date().toISOString() })
            .eq("usuario", login);
          return {
            sessao: {
              usuario: data.usuario,
              nome: data.nome_exibicao,
              perfil: data.perfil as Perfil,
              unidade: data.unidade && ehUnidadeValida(data.unidade) ? (data.unidade as Unidade) : null,
              // Congela a versão vigente no cookie: se o Comando revogar as
              // sessões (sessao_versao + 1), este cookie deixa de valer.
              sv: data.sessao_versao,
            },
            deveTrocarSenha: data.deve_trocar_senha,
          };
        }
      }
    } catch (erro) {
      // Banco indisponível não pode virar porta aberta: cai para a credencial
      // de emergência (se houver) e, na falta dela, recusa.
      console.error("[auth-usuarios] falha ao consultar usuarios_portal:", erro);
    }
  }

  return credencialDeEmergencia(usuario, senha);
}
