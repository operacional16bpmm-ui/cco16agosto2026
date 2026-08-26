"use client";

import { useActionState } from "react";
import Image from "next/image";
import { trocarSenhaAction, type TrocaState } from "./actions";

const inicial: TrocaState = { error: null };

/**
 * Troca obrigatória da chave de acesso provisória entregue pelo Comando.
 * Quem chega aqui já tem sessão (lib/db/permissoes.ts redireciona toda página
 * enquanto deve_trocar_senha estiver ligado), então a página não oferece saída
 * lateral: sair sem trocar significaria voltar e cair aqui de novo.
 */
export default function TrocarSenhaPage() {
  const [state, action, pending] = useActionState(trocarSenhaAction, inicial);

  return (
    <main className="flex min-h-screen items-center justify-center bg-tatico-fundo px-5 py-12 text-branco">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/brand/16bpmm.png"
            alt="Brasão do 16º BPM/M"
            width={64}
            height={90}
            className="h-20 w-auto drop-shadow-lg"
            priority
          />
          <h1 className="mt-4 text-lg font-extrabold tracking-tight">
            Defina sua senha pessoal
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-branco/50">
            Você entrou com a chave de acesso provisória entregue pelo Comando.
            Escolha agora uma senha pessoal para continuar.
          </p>
        </div>

        <form
          action={action}
          className="space-y-4 rounded-xl border border-branco/10 bg-tatico-super/60 p-6 shadow-2xl"
        >
          <Campo
            id="atual"
            rotulo="Chave de acesso recebida"
            autoComplete="current-password"
          />
          <Campo id="nova" rotulo="Nova senha" autoComplete="new-password" />
          <Campo
            id="confirmacao"
            rotulo="Repita a nova senha"
            autoComplete="new-password"
          />

          <p className="text-[11px] leading-relaxed text-branco/40">
            Mínimo de 10 caracteres. Não reutilize senha de outro sistema e não
            compartilhe: os lançamentos do portal ficam assinados com o seu
            usuário.
          </p>

          {state.error && (
            <p
              role="alert"
              className="rounded-md border border-vermelho/40 bg-vermelho/10 px-3 py-2 text-sm text-vermelho"
            >
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-azul px-4 py-2.5 text-sm font-semibold text-branco transition-colors hover:bg-azul-escuro disabled:opacity-60"
          >
            {pending ? "Salvando…" : "Salvar e entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Campo({
  id,
  rotulo,
  autoComplete,
}: {
  id: string;
  rotulo: string;
  autoComplete: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-branco/60"
      >
        {rotulo}
      </label>
      <input
        id={id}
        name={id}
        type="password"
        autoComplete={autoComplete}
        required
        className="w-full rounded-md border border-branco/15 bg-tatico-fundo px-3 py-2.5 text-sm text-branco outline-none focus:border-azul focus:ring-1 focus:ring-azul"
      />
    </div>
  );
}
