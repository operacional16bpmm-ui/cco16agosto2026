"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Home,
  LogOut,
  Menu,
  PenSquare,
  Presentation,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { URL_FORMULARIO, URL_PLANILHA } from "@/lib/cop2026";
import { cn } from "@/lib/utils";

export function NavegacaoV2({
  lidoEm,
  email,
  ehAdmin = false,
}: {
  lidoEm?: string;
  email?: string;
  ehAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);

  const links = [
    {
      href: "/cop2026/dashboard/v2",
      rotulo: "Dashboard V2",
      icone: <BarChart3 className="h-4 w-4" />,
      ativo: pathname === "/cop2026/dashboard/v2",
    },
    {
      href: "/cop2026/dashboard",
      rotulo: "Versão Original",
      icone: <Eye className="h-4 w-4" />,
      ativo: false,
    },
    {
      href: "/cop2026/briefing",
      rotulo: "Briefing",
      icone: <Presentation className="h-4 w-4" />,
      ativo: false,
    },
    {
      href: "/cop2026",
      rotulo: "Lançamento",
      icone: <PenSquare className="h-4 w-4" />,
      ativo: false,
    },
    {
      href: URL_PLANILHA,
      rotulo: "Planilha",
      icone: <FileSpreadsheet className="h-4 w-4" />,
      externo: true,
    },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070b14]/90 backdrop-blur-md shadow-2xl">
      {/* Banner da Versão Provisória */}
      <div className="bg-gradient-to-r from-ouro/20 via-ouro/10 to-transparent px-4 py-1.5 text-center text-xs font-semibold text-ouro border-b border-ouro/20 flex items-center justify-center gap-2">
        <Sparkles className="h-3.5 w-3.5 animate-pulse" />
        <span>Prévia Provisória V2 · Novo Design Escuro Executivo e Tipografia Nobre</span>
        <Link
          href="/cop2026/dashboard"
          className="ml-2 underline text-white hover:text-ouro transition-colors text-[11px]"
        >
          (Voltar para versão original)
        </Link>
      </div>

      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Identidade */}
        <div className="flex items-center gap-3.5">
          <Link
            href="/cop2026"
            className="flex items-center justify-center rounded-lg border border-white/10 p-2 text-slate-400 hover:border-vermelho/50 hover:bg-white/5 hover:text-white md:hidden"
            title="Voltar ao início"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <Link href="/cop2026" className="flex items-center gap-3 group">
            <div className="relative">
              <Image
                src="/brand/16bpmm.png"
                alt="Brasão do 16º BPM/M"
                width={48}
                height={48}
                className="h-10 w-auto transition-transform group-hover:scale-105 sm:h-12 drop-shadow-[0_0_12px_rgba(202,2,2,0.3)]"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-serif text-[15px] font-bold uppercase tracking-wider text-white sm:text-lg">
                  16º BPM/M · COP 2026
                </p>
                <span className="rounded-full bg-ouro/20 border border-ouro/40 px-2 py-0.5 text-[10px] font-extrabold text-ouro uppercase tracking-wider">
                  V2 Dark
                </span>
              </div>
              <div className="hidden items-center gap-1.5 text-[12px] text-slate-400 sm:flex">
                <span>Auditoria de Câmeras</span>
                <ChevronRight className="h-3 w-3" />
                <span className="font-medium text-slate-200">Painel Executivo</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Links Desktop */}
        <nav className="hidden items-center gap-1.5 lg:flex" aria-label="Navegação do Painel V2">
          {links.map((l) =>
            l.externo ? (
              <a
                key={l.rotulo}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-slate-300 transition-all hover:bg-white/5 hover:text-white"
              >
                {l.icone}
                <span>{l.rotulo}</span>
                <ExternalLink className="h-3 w-3 opacity-50" />
              </a>
            ) : (
              <Link
                key={l.rotulo}
                href={l.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all",
                  l.ativo
                    ? "border border-vermelho/50 bg-vermelho/15 text-white font-bold shadow-[0_0_15px_rgba(202,2,2,0.2)]"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                )}
              >
                {l.icone}
                <span>{l.rotulo}</span>
              </Link>
            )
          )}
        </nav>

        {/* Status e Acesso */}
        <div className="flex items-center gap-3">
          {lidoEm && (
            <span className="hidden items-center gap-1.5 text-[11.5px] text-slate-400 xl:flex bg-slate-900/60 border border-white/5 px-2.5 py-1 rounded-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>Sincronizado: {lidoEm}</span>
            </span>
          )}

          {ehAdmin && (
            <Link
              href="/cop2026/admin"
              className="hidden items-center gap-1 rounded-md border border-ouro/40 bg-ouro/10 px-2.5 py-1 text-[12px] font-bold text-ouro hover:bg-ouro/20 sm:flex shadow-sm"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Autorizados</span>
            </Link>
          )}

          {email && (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-[11.5px] text-slate-400 font-mono">{email}</span>
              <a
                href="/api/cop2026/acesso/sair"
                className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11.5px] font-semibold text-slate-400 hover:border-vermelho/50 hover:text-vermelho"
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
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-slate-900/80 text-slate-300 hover:text-white lg:hidden"
            aria-label="Abrir menu de navegação"
          >
            {menuAberto ? <X className="h-5 w-5 text-vermelho" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Menu Gaveta Mobile */}
      {menuAberto && (
        <div className="border-t border-white/10 bg-[#090d16] p-4 lg:hidden shadow-2xl">
          <div className="flex flex-col gap-2">
            <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-ouro">
              Módulos e Navegação
            </p>
            {links.map((l) =>
              l.externo ? (
                <a
                  key={l.rotulo}
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setMenuAberto(false)}
                  className="flex items-center justify-between rounded-lg p-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white"
                >
                  <div className="flex items-center gap-2.5">
                    {l.icone}
                    <span>{l.rotulo}</span>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 opacity-50" />
                </a>
              ) : (
                <Link
                  key={l.rotulo}
                  href={l.href}
                  onClick={() => setMenuAberto(false)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg p-2.5 text-sm font-semibold transition-colors",
                    l.ativo
                      ? "border border-vermelho/50 bg-vermelho/15 text-white font-bold"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {l.icone}
                  <span>{l.rotulo}</span>
                </Link>
              )
            )}

            <div className="mt-2 border-t border-white/10 pt-3">
              <a
                href={URL_FORMULARIO}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#ca0202] to-[#b00202] p-3 text-center text-sm font-bold text-white shadow-lg hover:brightness-110"
              >
                <PenSquare className="h-4 w-4" />
                <span>Lançar Auditoria (Forms)</span>
              </a>
            </div>

            {email && (
              <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-xs text-slate-400">
                <span className="truncate font-mono">{email}</span>
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
    </header>
  );
}
