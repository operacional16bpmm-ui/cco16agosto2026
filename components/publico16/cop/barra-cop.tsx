"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { URL_FORMULARIO } from "@/lib/cop2026";
import { cn } from "@/lib/utils";
import {
  IconeAuditores,
  IconeAutorizados,
  IconeBriefing,
  IconeDiretriz,
  IconeDivergencias,
  IconeInicio,
  IconeInstagram,
  IconeImportar,
  IconeLancamentos,
  IconeLancar,
  IconeMetas,
  IconePainel,
  IconeProblema,
  IconeRelatorios,
  IconeSaude,
  IconeTrilha,
  IconeUnidades,
  IconeWhatsApp,
} from "@/components/publico16/cop/icones-cop";

/**
 * Barra de atalhos da Auditoria de COP — a mesma em TODA página do módulo.
 *
 * Determinação do Fabricio (08/09/2026): antes disto, cada tela tinha o próprio
 * cabeçalho e o próprio conjunto de links. O Dashboard levava ao Briefing, a
 * Administração levava ao Dashboard, o formulário de lançamento não levava a
 * lugar nenhum — e a Diretriz, o contato de ajuda e as telas de correção só
 * existiam para quem já sabia a URL. Quem abre o portal no celular, no meio do
 * turno, não sabe.
 *
 * Ela é montada no `layout.tsx` do módulo, e não colada em cada página: rota
 * nova sob `/cop2026` nasce com a barra, sem ninguém lembrar de importá-la. É
 * a mesma lição da remoção parcial de UI — o que depende de lembrete volta a
 * divergir na terceira tela.
 *
 * TRÊS DECISÕES DE DESENHO
 *
 * 1. **Ícone acima do rótulo, em faixa que rola na horizontal.** No celular, um
 *    menu-gaveta esconde a navegação atrás de um toque que a tropa não dá; a
 *    faixa mostra os destinos sem clique nenhum e sobrevive a onze itens.
 * 2. **"Lançar auditoria" é o único item pintado sempre.** É a ação que o
 *    Batalhão precisa que aconteça; as outras são consulta.
 * 3. **Os itens de administração só existem para quem administra.** Não é só
 *    estética: `exigirAdminCop()` devolve 404 para os demais, e oferecer um
 *    botão que leva a 404 é pior do que não oferecer.
 */

type Atalho = {
  href: string;
  rotulo: string;
  /** Rótulo curto para o celular, onde o item tem ~72px. */
  curto?: string;
  Icone: (p: { size?: number; className?: string }) => React.ReactElement;
  /** Casa também as subrotas (`/relatorios/09`, `/admin/...`). */
  prefixo?: boolean;
  externo?: boolean;
  /** Ação principal do módulo: pintada mesmo quando não é a página atual. */
  destaque?: boolean;
};

const NAVEGACAO: Atalho[] = [
  { href: "/cop2026", rotulo: "Início", Icone: IconeInicio },
  {
    href: URL_FORMULARIO,
    rotulo: "Lançar auditoria",
    curto: "Lançar",
    Icone: IconeLancar,
    destaque: true,
  },
  { href: "/cop2026/dashboard", rotulo: "Painel", Icone: IconePainel },
  {
    /* Relatar problema do sistema — na barra, e não em cada tela. O Fabrício
       pediu em 08/09/2026 que o botão vermelho estivesse na home, no Painel E
       na Planilha; a barra vive no layout de `/cop2026` e já está nas três,
       além de qualquer tela nova. Repeti-lo por página produziria três textos
       e dois destinos desatualizados — e este é o botão que não pode falhar
       quando alguém precisar dele às 22h de um domingo.
       `destaque` porque ele é ação primária do módulo, como o lançamento: as
       duas coisas que a tropa faz aqui são registrar auditoria e avisar que o
       sistema caiu. */
    href: "/cop2026/inconsistencias",
    rotulo: "Relatar problemas do sistema",
    curto: "Problema",
    Icone: IconeProblema,
    destaque: true,
  },
  { href: "/cop2026/briefing", rotulo: "Briefing", Icone: IconeBriefing },
  {
    /* Fica na linha PÚBLICA, e não com as telas de administração, por
       determinação do Fabricio em 08/09/2026: é dela que os superiores leem o
       lançamento campo a campo. O endereço continua sob `/admin` para não
       quebrar link salvo, mas o gate da página passou a ser o mesmo do
       Dashboard — conta Google autorizada, não administrador. */
    href: "/cop2026/admin/lancamentos",
    rotulo: "Planilha de Lançamentos",
    curto: "Planilha",
    Icone: IconeLancamentos,
  },
  {
    href: "/cop2026/relatorios",
    rotulo: "Relatórios",
    Icone: IconeRelatorios,
    prefixo: true,
  },
  {
    href: "/documentos/diretriz-pm3-001-02-25.pdf",
    rotulo: "Diretriz",
    Icone: IconeDiretriz,
    externo: true,
  },
];

/**
 * As telas de administração, todas na barra — determinação do Fabricio em
 * 08/09/2026 ("todos os botões que você tem como admin"). Elas ficam numa
 * segunda linha, e não misturadas à navegação da tropa: são catorze destinos no
 * total, e uma fila só obrigaria a rolar para achar o Painel. A Planilha de
 * Lançamentos saiu daqui: ela é de consulta, não de administração.
 *
 * A ordem é a mesma das abas de dentro da administração
 * (`app/(public)/cop2026/admin/cabecalho-admin.tsx`) — duas ordens diferentes
 * para a mesma lista fazem a pessoa procurar duas vezes.
 */
const ADMINISTRACAO: Atalho[] = [
  { href: "/cop2026/admin", rotulo: "Autorizados", curto: "Autoriz.", Icone: IconeAutorizados },
  { href: "/cop2026/admin/auditores", rotulo: "Auditores", Icone: IconeAuditores },
  { href: "/cop2026/admin/parametros", rotulo: "Metas", Icone: IconeMetas },
  { href: "/cop2026/admin/unidades", rotulo: "Unidades", Icone: IconeUnidades },
  { href: "/cop2026/admin/trilha", rotulo: "Trilha", Icone: IconeTrilha },
  { href: "/cop2026/admin/importar", rotulo: "Importar", Icone: IconeImportar },
  {
    href: "/cop2026/admin/divergencias",
    rotulo: "Divergências",
    curto: "Diverg.",
    Icone: IconeDivergencias,
  },
  {
    /* A apuração dos relatos de indisponibilidade fica na linha de
       ADMINISTRAÇÃO, e não na pública: a fração relata (botão vermelho, aberto
       a todos) e o Comando trata (aqui). São dois públicos e duas telas. */
    href: "/cop2026/admin/inconsistencias",
    rotulo: "Inconsistências",
    curto: "Inconsist.",
    Icone: IconeProblema,
  },
  { href: "/cop2026/admin/saude", rotulo: "Saúde", Icone: IconeSaude },
];

/* Contato: o número é o mesmo do botão de socorro do formulário
   (components/publico16/ajuda-whatsapp.tsx) — dois números seriam duas filas de
   dúvida, e a segunda ninguém responde. */
const WHATSAPP = "5511949829748";
const MENSAGEM_AJUDA =
  "Olá! Sou do 16º BPM/M e preciso de ajuda com a Auditoria de COP 2026.";
const INSTAGRAM = "https://www.instagram.com/16bpmm_oficial/";

const CONTATO: Atalho[] = [
  {
    href: `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(MENSAGEM_AJUDA)}`,
    rotulo: "Ajuda",
    Icone: IconeWhatsApp,
    externo: true,
  },
  { href: INSTAGRAM, rotulo: "Instagram", curto: "Insta", Icone: IconeInstagram, externo: true },
];

function estaAtivo(pathname: string, atalho: Atalho): boolean {
  if (atalho.externo) return false;
  return atalho.prefixo ? pathname.startsWith(atalho.href) : pathname === atalho.href;
}

function Botao({ atalho, ativo }: { atalho: Atalho; ativo: boolean }) {
  const { Icone } = atalho;
  const conteudo = (
    <>
      <Icone size={21} />
      <span className="whitespace-nowrap text-[10.5px] font-bold uppercase leading-none tracking-[0.04em]">
        <span className="sm:hidden">{atalho.curto ?? atalho.rotulo}</span>
        <span className="hidden sm:inline">{atalho.rotulo}</span>
      </span>
    </>
  );

  const classe = cn(
    "flex min-w-[74px] shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-lg border px-3 py-2 transition-colors",
    ativo
      ? "border-vermelho bg-vermelho text-white shadow-[0_2px_10px_rgba(213,52,65,0.45)]"
      : atalho.destaque
        ? "border-vermelho bg-vermelho/30 text-white hover:bg-vermelho/45"
        : "border-white/15 text-white/80 hover:border-white/40 hover:bg-white/10 hover:text-white"
  );

  /* Link externo é `<a>` de propósito: `next/link` faria prefetch de um PDF e
     de dois domínios de fora. */
  return atalho.externo ? (
    <a
      href={atalho.href}
      target="_blank"
      rel="noopener noreferrer"
      className={classe}
      title={atalho.rotulo}
    >
      {conteudo}
    </a>
  ) : (
    <Link
      href={atalho.href}
      className={classe}
      title={atalho.rotulo}
      aria-current={ativo ? "page" : undefined}
    >
      {conteudo}
    </Link>
  );
}

function Separador() {
  return <span className="mx-1 h-9 w-px shrink-0 self-center bg-white/25" aria-hidden />;
}

export function BarraCop({ ehAdmin = false }: { ehAdmin?: boolean }) {
  const pathname = usePathname();

  /* A tela de acesso é a porta: oferecer nela os atalhos que exigem sessão
     devolveria a pessoa para a própria porta, em círculo. */
  if (pathname.startsWith("/cop2026/acesso")) return null;

  return (
    <div className="sticky top-0 z-50 bg-azul-noite shadow-[0_2px_12px_rgba(0,0,0,0.25)]">
      <div className="mx-auto max-w-[1400px] px-3 py-2 sm:px-5">
        <div className="flex items-center gap-3">
          {/* Assinatura do módulo — some no celular, onde o espaço é dos botões. */}
          <div className="hidden shrink-0 border-r border-white/15 pr-4 lg:block">
            <p className="font-serif text-[13px] font-bold uppercase leading-tight tracking-wide text-white">
              Auditoria de COP
            </p>
            <p className="text-[10.5px] uppercase tracking-[0.12em] text-white/60">
              16º BPM/M · 2026
            </p>
          </div>

          <nav
            aria-label="Atalhos da Auditoria de COP"
            className="flex flex-1 snap-x items-stretch gap-1.5 overflow-x-auto py-0.5"
          >
            {NAVEGACAO.map((a) => (
              <Botao key={a.href} atalho={a} ativo={estaAtivo(pathname, a)} />
            ))}
            <Separador />
            {CONTATO.map((a) => (
              <Botao key={a.href} atalho={a} ativo={false} />
            ))}
          </nav>
        </div>

        {/* Segunda linha: administração. Só existe para quem administra —
            `exigirAdminCop()` responde 404 aos demais, e botão que leva a 404
            faz a tropa achar que o portal quebrou. */}
        {ehAdmin && (
          <div className="mt-1.5 flex items-center gap-3 border-t border-white/10 pt-1.5">
            <span className="hidden shrink-0 border-r border-white/15 py-1 pr-4 text-[10px] font-bold uppercase leading-tight tracking-[0.14em] text-ouro lg:block">
              Administração
            </span>
            <nav
              aria-label="Administração da Auditoria de COP"
              className="flex flex-1 snap-x items-stretch gap-1.5 overflow-x-auto py-0.5"
            >
              {ADMINISTRACAO.map((a) => (
                <Botao key={a.href} atalho={a} ativo={estaAtivo(pathname, a)} />
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* Faixa institucional: fecha a barra com o vermelho do brasão. */}
      <div className="faixa-institucional h-1" />
    </div>
  );
}
