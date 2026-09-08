import Image from "next/image";
import Link from "next/link";
import { Clock, LogOut } from "lucide-react";

import { FaixaCreditos } from "@/components/publico16/creditos";
import { BotaoAdmin } from "@/components/publico16/cop/botao-admin";

/**
 * Cabeçalho de identidade das telas de consulta da COP (painel, briefing,
 * relatórios): quem é o módulo, em que tela a pessoa está, de quando é a
 * leitura e qual conta está aberta.
 *
 * **A NAVEGAÇÃO SAIU DAQUI em 08/09/2026** e passou para a `BarraCop`, montada
 * no `layout.tsx` do módulo. Antes, os atalhos existiam só nas sete telas que
 * importavam este componente — o formulário de lançamento, o briefing e as nove
 * telas de administração ficavam sem saída, e cada uma tinha o próprio conjunto
 * de links. Duplicar a navegação aqui a faria divergir da barra na primeira
 * tela nova; por isso este arquivo não tem mais link de destino nenhum.
 *
 * Com os links foram embora o `useState` do menu-gaveta e o `usePathname` que
 * marcava o item ativo: o componente deixou de ser client e não manda mais
 * JavaScript para o celular da tropa.
 *
 * Perdeu também o `sticky`: quem gruda no topo agora é a barra de atalhos, e
 * duas peças fixas empilhadas comem meia tela de celular.
 */
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
  return (
    <>
      {/* Créditos da equipe: faixa do topo, antes do cabeçalho. */}
      <FaixaCreditos />

      <header className="border-b border-borda bg-tatico-super shadow-inst">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/cop2026" className="group flex items-center">
              <Image
                src="/brand/logo-auditoria-cop2026-transparent.png"
                alt="16º BPM/M · Auditoria COP 2026 — Controle e Fiscalização das Câmeras Operacionais Corporais"
                width={280}
                height={80}
                className="h-11 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.03] sm:h-14"
                priority
              />
            </Link>

            {/* Onde a pessoa está. Cada página já passava o próprio título nesta
                prop e o componente simplesmente não o desenhava — oito telas
                distintas com o mesmo cabeçalho. */}
            <span
              className="hidden max-w-[24ch] truncate border-l border-borda pl-3 text-[13px] font-semibold text-texto-suave md:block"
              title={tituloPagina}
            >
              {tituloPagina}
            </span>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {lidoEm && (
              <span className="hidden items-center gap-1.5 text-[11.5px] text-texto-suave sm:flex">
                <span className="animar-ao-vivo h-2 w-2 rounded-full bg-sinal-conforme" />
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
          </div>
        </div>

        {/* Faixa institucional de honra */}
        <div className="faixa-institucional h-1" />
      </header>
    </>
  );
}
