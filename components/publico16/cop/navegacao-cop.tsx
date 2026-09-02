"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Clock,
  FileBarChart2,
  FileText,
  LogOut,
  Menu,
  PenSquare,
  Presentation,
  X,
} from "lucide-react";
import { URL_FORMULARIO } from "@/lib/cop2026";
import { cn } from "@/lib/utils";
import { FaixaCreditos } from "@/components/publico16/creditos";
import { BotaoAdmin } from "@/components/publico16/cop/botao-admin";

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
      href: "/cop2026/relatorios",
      rotulo: "Relatórios",
      icone: <FileBarChart2 className="h-4 w-4" />,
      ativo: pathname.startsWith("/cop2026/relatorios"),
    },
    {
      href: "/cop2026",
      rotulo: "Lançamento",
      icone: <PenSquare className="h-4 w-4" />,
      ativo: pathname === "/cop2026",
    },
    /* O item "Planilha" saiu daqui em 01/09/2026: o atalho para a base bruta
       do Google Sheets deixou de aparecer em toda tela do módulo e vive só no
       Relatório de Dados do mês (/cop2026/relatorios/<mes>/dados), onde tem
       contexto. Com ele foi embora o último link externo do menu. */
  ];

  return (
    <>
      {/* Créditos da equipe: faixa do topo, antes do cabeçalho. */}
      <FaixaCreditos />

    <header className="border-b border-borda bg-tatico-super sticky top-0 z-40 shadow-inst">
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
              src="/brand/logo-auditoria-cop2026-transparent.png"
              alt="16º BPM/M · Auditoria COP 2026 — Controle e Fiscalização das Câmeras Operacionais Corporais"
              width={280}
              height={80}
              className="h-11 sm:h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.03]"
              priority
            />
          </Link>

          {/* Onde a pessoa está. Cada página já passava o próprio título nesta
              prop e o componente simplesmente não o desenhava — oito telas
              distintas com o mesmo cabeçalho. Só no desktop: no mobile o
              espaço é do logo e do botão do menu. */}
          <span
            className="hidden max-w-[22ch] truncate border-l border-borda pl-3 text-[13px] font-semibold text-texto-suave md:block"
            title={tituloPagina}
          >
            {tituloPagina}
          </span>
        </div>

        {/* Links Desktop */}
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegação do COP2026">
          {linksNavegacao.map((l) => (
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
          ))}
        </nav>

        {/* Informações da Leitura & Usuário */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* O lançamento saiu do Google Forms e virou rota do portal em
              01/09/2026. Ganhou lugar fixo no cabeçalho — e não só no menu
              mobile — porque o Comando abre o painel, vê a fração atrasada e o
              caminho para cobrar precisa estar à mão, na mesma tela. */}
          <Link
            href={URL_FORMULARIO}
            className="hidden items-center gap-1.5 rounded-md border border-vermelho/40 bg-vermelho/10 px-3 py-1.5 text-[12.5px] font-bold text-vermelho transition-colors hover:bg-vermelho/20 md:flex"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Lançar auditoria</span>
          </Link>

          {lidoEm && (
            <span className="hidden items-center gap-1.5 text-[11.5px] text-texto-suave xl:flex">
              <span className="h-2 w-2 rounded-full bg-sinal-conforme animar-ao-vivo" />
              <Clock className="h-3.5 w-3.5" />
              <span>{lidoEm}</span>
            </span>
          )}

          <BotaoAdmin ehAdmin={ehAdmin} className="hidden sm:inline-flex" />

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
            {linksNavegacao.map((l) => (
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
            ))}

            <div className="mt-2 border-t border-borda/60 pt-3">
              <a
                href={URL_FORMULARIO}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-vermelho p-3 text-center text-sm font-bold text-white shadow-sm hover:bg-vermelho/90"
              >
                <PenSquare className="h-4 w-4" />
                <span>Lançar Auditoria do Turno</span>
              </a>
            </div>

            {/* O botão de admin some abaixo de `sm` no cabeçalho; sem esta
                entrada, quem administra pelo celular não tinha caminho nenhum
                para a administração — e o Major abre o painel no telefone. */}
            {ehAdmin && (
              <div className="mt-2 border-t border-borda/60 pt-3">
                <BotaoAdmin ehAdmin={ehAdmin} className="w-full justify-center py-2.5 text-sm" />
              </div>
            )}

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
    </>
  );
}
