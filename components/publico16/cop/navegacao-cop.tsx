"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  ChevronRight,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Home,
  LogOut,
  Menu,
  PenSquare,
  Presentation,
  ShieldCheck,
  X,
} from "lucide-react";
import { URL_FORMULARIO, URL_PLANILHA } from "@/lib/cop2026";
import { cn } from "@/lib/utils";

export function NavegacaoCop({
  lidoEm,
  email,
  ehAdmin = false,
  tituloPagina = "Dashboard de controle",
}: {
  lidoEm?: string;
  email?: string;
  ehAdmin?: boolean;
  tituloPagina?: string;
}) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);

  const linksNavegacao = [
    {
      href: "/cop2026/dashboard",
      rotulo: "Dashboard",
      icone: <BarChart3 className="h-4 w-4" />,
      ativo: pathname === "/cop2026/dashboard",
    },
    {
      href: "/cop2026/briefing",
      rotulo: "Briefing",
      icone: <Presentation className="h-4 w-4" />,
      ativo: pathname === "/cop2026/briefing",
    },
    {
      href: "/cop2026",
      rotulo: "Lançamento",
      icone: <PenSquare className="h-4 w-4" />,
      ativo: pathname === "/cop2026",
    },
    {
      href: URL_PLANILHA,
      rotulo: "Planilha",
      icone: <FileSpreadsheet className="h-4 w-4" />,
      externo: true,
    },
  ];

  return (
    <header className="border-b border-borda bg-tatico-super sticky top-0 z-30 shadow-inst">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5">
        {/* Identidade e Botão Voltar */}
        <div className="flex items-center gap-3">
          <Link
            href="/cop2026"
            className="flex items-center justify-center rounded-lg border border-borda/80 p-2 text-texto-suave transition-colors hover:border-vermelho/50 hover:bg-branco/5 hover:text-branco md:hidden"
            title="Voltar ao início"
            aria-label="Voltar ao início"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <Link href="/cop2026" className="flex items-center group">
            {/* Logo Auditoria COP 2026 */}
            <Image
              src="/brand/logo-auditoria-cop2026.webp"
              alt="16º BPM/M · Auditoria COP 2026 — Controle e Fiscalização das Câmeras Operacionais Corporais"
              width={280}
              height={80}
              className="h-11 sm:h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.03]"
              priority
            />
          </Link>
        </div>

        {/* Links Desktop */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegação do COP2026">
          {linksNavegacao.map((l) =>
            l.externo ? (
              <a
                key={l.rotulo}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-texto-suave transition-colors hover:bg-branco/5 hover:text-branco"
              >
                {l.icone}
                <span>{l.rotulo}</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            ) : (
              <Link
                key={l.rotulo}
                href={l.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors",
                  l.ativo
                    ? "border border-vermelho/40 bg-vermelho/10 text-vermelho"
                    : "text-texto-suave hover:bg-branco/5 hover:text-branco"
                )}
              >
                {l.icone}
                <span>{l.rotulo}</span>
              </Link>
            )
          )}
        </nav>

        {/* Informações da Leitura & Usuário */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {lidoEm && (
            <span className="hidden items-center gap-1.5 text-[11.5px] text-texto-suave xl:flex">
              <span className="h-2 w-2 rounded-full bg-sinal-conforme animar-ao-vivo" />
              <Clock className="h-3.5 w-3.5" />
              <span>{lidoEm}</span>
            </span>
          )}

          {ehAdmin && (
            <Link
              href="/cop2026/admin"
              className="hidden items-center gap-1 rounded-md border border-ouro/40 bg-ouro/10 px-2.5 py-1 text-[12px] font-semibold text-ouro transition-colors hover:bg-ouro/20 sm:flex"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Autorizados</span>
            </Link>
          )}

          {email && (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="dados text-[11px] text-texto-suave">{email}</span>
              <a
                href="/api/cop2026/acesso/sair"
                className="flex items-center gap-1 rounded-md border border-borda px-2 py-1 text-[11.5px] font-semibold text-texto-suave hover:border-vermelho/40 hover:text-vermelho"
                title="Encerrar sessão"
              >
                <LogOut className="h-3 w-3" />
                <span className="hidden md:inline">Sair</span>
              </a>
            </div>
          )}

          {/* Botão Menu Mobile */}
          <button
            type="button"
            onClick={() => setMenuAberto(!menuAberto)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-borda bg-tatico-super text-texto-suave hover:text-branco lg:hidden"
            aria-label="Abrir menu de navegação"
          >
            {menuAberto ? <X className="h-5 w-5 text-vermelho" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Menu Gaveta Mobile */}
      {menuAberto && (
        <div className="border-t border-borda bg-tatico-super p-4 lg:hidden">
          <div className="flex flex-col gap-2">
            <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-ouro">
              Módulos de Auditoria
            </p>
            {linksNavegacao.map((l) =>
              l.externo ? (
                <a
                  key={l.rotulo}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setMenuAberto(false)}
                  className="flex items-center justify-between rounded-lg p-2.5 text-sm font-semibold text-texto-suave hover:bg-branco/5 hover:text-branco"
                >
                  <div className="flex items-center gap-2.5">
                    {l.icone}
                    <span>{l.rotulo}</span>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                </a>
              ) : (
                <Link
                  key={l.rotulo}
                  href={l.href}
                  onClick={() => setMenuAberto(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg p-2.5 text-sm font-semibold transition-colors",
                    l.ativo
                      ? "border border-vermelho/40 bg-vermelho/10 text-vermelho font-bold"
                      : "text-texto-suave hover:bg-branco/5 hover:text-branco"
                  )}
                >
                  {l.icone}
                  <span>{l.rotulo}</span>
                </Link>
              )
            )}

            <div className="mt-2 border-t border-borda/60 pt-3">
              <a
                href={URL_FORMULARIO}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-vermelho p-3 text-center text-sm font-bold text-white shadow-sm hover:bg-vermelho/90"
              >
                <PenSquare className="h-4 w-4" />
                <span>Lançar Auditoria no Google Forms</span>
              </a>
            </div>

            {email && (
              <div className="mt-2 flex items-center justify-between border-t border-borda/60 pt-2 text-xs text-texto-suave">
                <span className="dados truncate">{email}</span>
                <a
                  href="/api/cop2026/acesso/sair"
                  className="flex items-center gap-1 font-semibold text-vermelho"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sair
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Faixa institucional de honra */}
      <div className="faixa-institucional h-1" />
    </header>
  );
}
