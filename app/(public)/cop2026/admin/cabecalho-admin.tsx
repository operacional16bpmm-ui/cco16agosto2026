import Image from "next/image";
import Link from "next/link";
import { ChevronRight, LogOut } from "lucide-react";

/**
 * Cabeçalho das telas de administração da COP.
 *
 * Extraído quando a administração deixou de ser uma tela só (Autorizados) e
 * virou quatro — Autorizados, Lançamentos, Auditores e Metas. Cabeçalho
 * copiado é cabeçalho que diverge: o Major navega entre as telas e cobra a
 * diferença.
 */
export function CabecalhoAdmin({
  secao,
  email,
  largura = "max-w-[1100px]",
}: {
  secao: string;
  email: string;
  largura?: string;
}) {
  return (
    <header className="border-b border-borda bg-tatico-super">
      <div className={`mx-auto flex ${largura} flex-wrap items-center justify-between gap-4 px-5 py-4`}>
        <div className="flex items-center gap-4">
          <Image
            src="/brand/16bpmm.png"
            alt="Brasão do 16º BPM/M"
            width={56}
            height={56}
            className="h-12 w-auto"
            priority
          />
          <div>
            <p className="font-serif text-lg font-bold uppercase leading-tight tracking-wide text-branco sm:text-xl">
              16º BPM/M · Auditoria de COP 2026
            </p>
            <nav
              aria-label="Trilha de navegação"
              className="mt-0.5 flex items-center gap-1 text-[12px] text-texto-suave"
            >
              <Link href="/cop2026" className="hover:text-vermelho">
                COP 2026
              </Link>
              <ChevronRight size={12} aria-hidden />
              <span className="font-semibold text-branco">{secao}</span>
            </nav>
          </div>
        </div>
        {/* Os atalhos para Painel e Briefing saíram daqui em 08/09/2026: eles
            vivem na `BarraCop`, que aparece em todas as telas do módulo. Aqui
            fica só a sessão — o que é desta tela, e não do módulo. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-texto-suave">
          <span className="inline-flex items-center gap-2">
            <span className="dados">{email}</span>
            <a
              href="/api/cop2026/acesso/sair"
              className="inline-flex items-center gap-1 rounded-md border border-borda px-2 py-1 font-semibold hover:border-vermelho/40 hover:text-vermelho"
            >
              <LogOut size={12} aria-hidden /> Sair
            </a>
          </span>
        </div>
      </div>
      <div className="faixa-institucional h-1.5" />
    </header>
  );
}

/** Abas da administração. Vive aqui e não em cada página para que uma tela nova
 *  apareça nas outras sem edição em quatro arquivos. */
export function AbasAdmin({ atual }: { atual: string }) {
  const abas = [
    { href: "/cop2026/admin", rotulo: "Autorizados" },
    { href: "/cop2026/admin/lancamentos", rotulo: "Lançamentos" },
    { href: "/cop2026/admin/auditores", rotulo: "Auditores" },
    { href: "/cop2026/admin/parametros", rotulo: "Metas" },
    { href: "/cop2026/admin/unidades", rotulo: "Unidades" },
    { href: "/cop2026/admin/trilha", rotulo: "Trilha" },
    { href: "/cop2026/admin/importar", rotulo: "Importar" },
    { href: "/cop2026/admin/divergencias", rotulo: "Divergências" },
    { href: "/cop2026/admin/saude", rotulo: "Saúde" },
  ];
  return (
    <nav className="mx-auto flex max-w-[1100px] flex-wrap gap-2 px-5 pt-6" aria-label="Administração">
      {abas.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          aria-current={a.href === atual ? "page" : undefined}
          className={`rounded-md border px-3.5 py-2 text-[12.5px] font-bold uppercase tracking-wide transition-colors ${
            a.href === atual
              ? "border-vermelho bg-vermelho/10 text-vermelho"
              : "border-borda text-texto-suave hover:border-vermelho/40 hover:text-vermelho"
          }`}
        >
          {a.rotulo}
        </Link>
      ))}
    </nav>
  );
}
