import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, LogIn, ShieldCheck } from "lucide-react";
import { URL_FORMULARIO } from "@/lib/cop2026";

export const metadata: Metadata = {
  title: "Acesso restrito · Auditoria de COP 2026",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const Google = () => (
  <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden focusable="false">
    <path fill="#4285F4" d="M45 24c0-1.6-.1-2.7-.4-4H24v7.5h12c-.2 2-1.6 5-4.5 7l6.9 5.3C42.5 36.2 45 30.6 45 24z" />
    <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.3c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.8-3.9-12.5-9.2l-7.1 5.5C7.9 41 15.4 46 24 46z" />
    <path fill="#FBBC05" d="M11.5 28.4c-.5-1.3-.7-2.8-.7-4.4s.3-3 .7-4.4l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 9.9l7.1-5.5z" />
    <path fill="#EA4335" d="M24 10.6c3.3 0 6.2 1.1 8.5 3.3l6.1-6.1C34.9 4.2 29.9 2 24 2 15.4 2 7.9 7 4.4 14.1l7.1 5.5c1.7-5.3 6.7-9 12.5-9z" />
  </svg>
);

export default async function AcessoCopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const um = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const negado = um("negado");
  const falha = um("falha");
  const saiu = um("saiu");
  const naoVerificado = um("motivo") === "nao-verificado";
  const destino = um("redirect") || "/cop2026/dashboard";

  return (
    <div className="tema-institucional flex min-h-screen flex-col bg-tatico-fundo text-[15px] text-branco">
      <header className="border-b border-borda bg-tatico-super">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-5 py-4">
          <Image
            src="/brand/16bpmm.png"
            alt="Brasão do 16º BPM/M"
            width={48}
            height={48}
            className="h-11 w-auto"
            priority
          />
          <p className="font-serif text-base font-bold uppercase leading-tight tracking-wide sm:text-lg">
            16º BPM/M · Auditoria de COP 2026
          </p>
        </div>
        <div className="faixa-institucional h-1.5" />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <div className="rounded-xl border border-borda bg-tatico-super p-6 shadow-inst sm:p-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-borda px-3 py-1 rotulo-dado text-texto-suave">
            <ShieldCheck size={14} aria-hidden /> Acesso restrito
          </span>

          <h1 className="mt-4 font-serif text-2xl font-bold uppercase leading-tight tracking-wide">
            Área do Comando
          </h1>
          <p className="mt-3 text-[14.5px] leading-relaxed text-texto-suave">
            O Dashboard de controle e o Briefing executivo são de uso restrito aos oficiais e praças
            designados para o acompanhamento da auditoria. O acesso usa a{" "}
            <strong className="text-branco">mesma conta Google</strong> que recebeu as abas
            restritas da planilha.
          </p>

          {negado && (
            <p
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-lg border border-sinal-critico/40 bg-sinal-critico-suave px-4 py-3 text-[13.5px] text-sinal-critico"
            >
              <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                {naoVerificado ? (
                  <>
                    A conta <strong className="dados">{negado}</strong> não tem o email verificado no
                    Google, então não é possível confirmar quem é.
                  </>
                ) : (
                  <>
                    A conta <strong className="dados">{negado}</strong> não está na relação de
                    autorizados. Se você deveria estar, procure o Estado-Maior do Batalhão — a
                    inclusão é a mesma do compartilhamento da planilha.
                  </>
                )}
              </span>
            </p>
          )}

          {falha && (
            <p
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-lg border border-sinal-atencao/40 bg-sinal-atencao-suave px-4 py-3 text-[13.5px] text-sinal-atencao"
            >
              <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden />
              <span>{falha}</span>
            </p>
          )}

          {saiu && (
            <p className="mt-5 rounded-lg border border-borda px-4 py-3 text-[13.5px] text-texto-suave">
              Sessão encerrada. Feche a aba se estiver em computador compartilhado.
            </p>
          )}

          <a
            href={`/api/cop2026/acesso/iniciar?redirect=${encodeURIComponent(destino)}`}
            className="mt-6 inline-flex items-center gap-2.5 rounded-md border border-borda bg-branco/[0.03] px-5 py-3 text-[14px] font-bold text-branco shadow-inst transition-colors hover:border-vermelho/40"
          >
            <Google />
            Entrar com o Google
            <LogIn size={15} aria-hidden />
          </a>

          <div className="mt-8 border-t border-borda pt-5">
            <p className="text-[13.5px] leading-relaxed text-texto-suave">
              <strong className="text-branco">É policial e veio lançar a auditoria?</strong> O
              formulário é aberto e não pede login.
            </p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              <a
                href={URL_FORMULARIO}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-vermelho/40 px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide text-vermelho hover:bg-vermelho/5"
              >
                Abrir o formulário
              </a>
              <Link
                href="/cop2026"
                className="inline-flex items-center gap-2 rounded-md border border-borda px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide text-texto-suave hover:border-vermelho/40 hover:text-vermelho"
              >
                <ArrowLeft size={14} aria-hidden /> Voltar à página da COP
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-borda bg-tatico-super">
        <div className="faixa-institucional h-1" />
        <div className="mx-auto max-w-3xl px-5 py-4 text-[11.5px] text-texto-suave">
          Portal CCO-16 · 16º BPM/M · uso restrito
        </div>
      </footer>
    </div>
  );
}
