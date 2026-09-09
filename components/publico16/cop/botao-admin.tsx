import Link from "next/link";

import { cn } from "@/lib/utils";
import { IconeAdministracao } from "@/components/publico16/cop/icones-cop";

/**
 * O botão de ADMINISTRAÇÃO da COP — um só, em TODAS as telas do módulo.
 *
 * MUDANÇA DE 09/09/2026, determinação do Major Zochio: ele passou a aparecer
 * para todo mundo, e não só para quem está em `COP2026_ADMINS`. Antes ele era
 * invisível para quem não tinha sessão — e quem não tem sessão é exatamente
 * quem precisa achar a porta. O pedido foi textual: *"o botão administrador,
 * que pede login, deixe esse botão em todas as janelas lá em cima junto com os
 * outros botões, bem destacado e ícone diferente (tecnologia)"*.
 *
 * O QUE IMPEDE O 404 (a objeção que existia contra mostrá-lo sempre):
 * o destino muda com a sessão. Quem administra vai direto para
 * `/cop2026/admin`; quem não administra vai para a PORTA (`/cop2026/acesso`),
 * que é página aberta, explica a regra e oferece o login com o Google — com o
 * retorno já apontado para a administração. Ninguém cai no 404 de
 * `exigirAdminCop()` clicando aqui.
 *
 * E VER O BOTÃO NÃO É O CONTROLE DE ACESSO — nunca foi. Quem digitar
 * `/cop2026/admin` sem estar na lista leva 404, e cada server action rechega
 * por conta própria. Esta é a camada que menos importa: ela é navegação.
 */

/** Quem administra entra direto. */
export const DESTINO_ADMIN = "/cop2026/admin";
/** Quem não administra passa pela porta, com o retorno já apontado para cá.
 *  O `redirect` é lido em `app/(public)/cop2026/acesso/page.tsx`. */
export const DESTINO_ADMIN_LOGIN = "/cop2026/acesso?redirect=%2Fcop2026%2Fadmin";

export function destinoAdmin(ehAdmin: boolean): string {
  return ehAdmin ? DESTINO_ADMIN : DESTINO_ADMIN_LOGIN;
}

export function BotaoAdmin({
  ehAdmin,
  className,
  /** "claro" para os cabeçalhos de fundo claro (home, lançamento, relato de
   *  problema); "escuro" para as superfícies táticas. */
  variante = "claro",
}: {
  ehAdmin: boolean;
  className?: string;
  variante?: "claro" | "escuro";
}) {
  return (
    <Link
      href={destinoAdmin(ehAdmin)}
      title={
        ehAdmin
          ? "Administração da Auditoria de COP"
          : "Administração da Auditoria de COP — entrar com a conta autorizada"
      }
      /* Borda em `style`: `app/globals.css` tem `* { border-color: var(--borda) }`
         FORA de camada, e no Tailwind v4 isso vence qualquer `border-*` de
         utilitário. Ver a nota longa em cartao-acao.tsx. */
      style={{ borderColor: variante === "claro" ? "#0e3a63" : "rgba(56,189,248,0.55)" }}
      className={cn(
        "group relative inline-flex min-h-11 shrink-0 items-center gap-1.5 overflow-hidden rounded-lg border px-2.5 py-1.5 sm:gap-2 sm:px-3 sm:py-2",
        "text-[11px] font-bold uppercase tracking-[0.07em] transition-all sm:text-[12px] sm:font-black sm:tracking-[0.08em]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38bdf8]",
        variante === "claro"
          ? "bg-gradient-to-br from-[#123f68] to-[#0a2440] text-white shadow-[0_6px_16px_rgba(10,36,64,0.30)] hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(10,36,64,0.42)]"
          : "bg-[#0d2b46] text-[#dbeafe] shadow-[0_4px_14px_rgba(0,0,0,0.35)] hover:bg-[#123a5c]",
        className
      )}
    >
      {/* Varredura de scanline: o mesmo gesto dos cartões da home — é o que
          amarra este botão à linguagem "tecnologia de câmeras" e o separa dos
          botões vermelhos de ocorrência. Decorativo, some para quem pediu
          menos movimento (prefers-reduced-motion, em globals.css). */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#38bdf8]/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
      />
      <IconeAdministracao size={16} className="relative shrink-0 text-[#7dd3fc] sm:size-[17px]" />
      <span className="relative">Administração</span>
      {/* Sem sessão o rótulo diz o que vai acontecer no clique. Some no celular,
          onde a barra é estreita — lá o destino é a própria porta. */}
      {!ehAdmin && (
        <span className="relative hidden rounded bg-white/15 px-1.5 py-0.5 text-[9.5px] font-bold tracking-normal sm:inline">
          login
        </span>
      )}
    </Link>
  );
}
