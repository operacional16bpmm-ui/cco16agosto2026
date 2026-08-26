"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const searchParams = useSearchParams();
  // Vazio de propósito quando não houve redirecionamento: quem decide o
  // destino é o perfil do usuário (lib/autorizacao.ts:rotaInicial).
  const redirect = searchParams.get("redirect") ?? "";

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
            Sala de Comando · CCO-16
          </h1>
          <p className="mt-1 text-xs uppercase tracking-wider text-branco/50">
            Acesso restrito · Uso reservado
          </p>
        </div>

        <form
          action={formAction}
          className="space-y-4 rounded-xl border border-branco/10 bg-tatico-super/60 p-6 shadow-2xl"
        >
          <input type="hidden" name="redirect" value={redirect} />

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-branco/60"
            >
              Usuário institucional
            </label>
            <input
              id="email"
              name="email"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              placeholder="16bpmmcomando"
              className="w-full rounded-md border border-branco/15 bg-tatico-fundo px-3 py-2.5 text-sm text-branco placeholder:text-branco/30 outline-none focus:border-azul focus:ring-1 focus:ring-azul"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-branco/60"
            >
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-md border border-branco/15 bg-tatico-fundo px-3 py-2.5 text-sm text-branco outline-none focus:border-azul focus:ring-1 focus:ring-azul"
            />
          </div>

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
            {pending ? "Verificando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-branco/40">
          <a href="/" className="hover:text-branco/70">
            ← Voltar à página institucional
          </a>
        </p>
      </div>
    </main>
  );
}
