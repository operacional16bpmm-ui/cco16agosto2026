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
 *
 * **AS ABAS SAÍRAM DAQUI em 08/09/2026.** As nove telas de administração viraram
 * a segunda linha da `BarraCop`, que aparece em todo o módulo — mantê-las nos
 * dois lugares empilhava duas fileiras idênticas na mesma tela e criava duas
 * listas para atualizar quando nascesse a décima. Sobrou o que é desta tela e
 * não do módulo: o brasão, a trilha de onde a pessoa está e a sessão aberta.
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
