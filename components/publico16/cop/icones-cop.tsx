/**
 * Ícones da barra de atalhos da COP — desenhados aqui, não importados.
 *
 * POR QUE NÃO USAR A BIBLIOTECA: os ícones do `lucide-react` que a barra
 * precisaria (`LayoutDashboard`, `Presentation`, `FileWarning`, `Table`) são
 * genéricos de software de escritório e, lado a lado numa faixa institucional,
 * não distinguem uma tela da outra — o Comando abre no celular e todas viram o
 * mesmo retângulo cinza. Aqui cada símbolo carrega o traço da própria função:
 * o escudo do Batalhão no início, a prancheta com caneta no lançamento, a
 * barra com a linha de meta no painel.
 *
 * REGRA DE DESENHO, para o próximo ícone nascer igual aos dezessete:
 *
 * - grade de 24×24, com folga de 2px na borda — nada encosta no limite;
 * - traço `1.75`, `round` nas pontas e nas junções, `fill="none"`;
 * - a cor vem SEMPRE de `currentColor`: quem pinta é o botão, não o ícone,
 *   senão o estado ativo da barra não muda o desenho junto com o texto;
 * - preenchimento só em detalhe pequeno (o ponto da lente, a estrela), e ainda
 *   assim com `stroke="none"` explícito, senão o traço engorda o detalhe;
 * - nada de `title` interno: os ícones são decorativos (`aria-hidden`) e quem
 *   nomeia o botão é o texto ao lado, que existe em todas as larguras.
 */

type Props = { size?: number; className?: string };

function Svg({
  size = 22,
  className,
  children,
}: Props & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

/** Início — o escudo do Batalhão com a estrela de cinco pontas. */
export function IconeInicio(p: Props) {
  return (
    <Svg {...p}>
      <path d="M12 2.6 4.6 5.4v6.1c0 4.3 3 8.2 7.4 9.9 4.4-1.7 7.4-5.6 7.4-9.9V5.4L12 2.6Z" />
      <path
        d="m12 8.2 1.15 2.5 2.65.32-1.96 1.83.52 2.65L12 14.2l-2.36 1.3.52-2.65-1.96-1.83 2.65-.32L12 8.2Z"
        fill="currentColor"
        stroke="none"
      />
    </Svg>
  );
}

/** Lançar auditoria — prancheta de serviço com a caneta em cima. */
export function IconeLancar(p: Props) {
  return (
    <Svg {...p}>
      <path d="M8.4 4.2H6.6A1.6 1.6 0 0 0 5 5.8v13.4a1.6 1.6 0 0 0 1.6 1.6h6.2" />
      <path d="M15.6 4.2h1.8A1.6 1.6 0 0 1 19 5.8v3.1" />
      <rect x="8.4" y="2.6" width="7.2" height="3.2" rx="1" />
      <path d="M8.6 11h4.2M8.6 14.4h2.8" />
      <path d="m20.4 12.1 1.4 1.4-5 5-1.9.5.5-1.9 5-5Z" />
    </Svg>
  );
}

/** Painel — três barras e a linha tracejada da meta cruzando por cima. */
export function IconePainel(p: Props) {
  return (
    <Svg {...p}>
      <path d="M3.6 20.2h16.8" />
      <path d="M6.6 20.2v-5.4M11.4 20.2V9.6M16.2 20.2v-8" />
      <path d="M3.6 7.4h2.2M9 7.4h2.2M14.4 7.4h2.2M19.8 7.4h.6" />
    </Svg>
  );
}

/** Briefing — a tela de projeção com a curva de desempenho. */
export function IconeBriefing(p: Props) {
  return (
    <Svg {...p}>
      <path d="M4 3.6h16" />
      <path d="M5.4 3.6v9.8a1.4 1.4 0 0 0 1.4 1.4h10.4a1.4 1.4 0 0 0 1.4-1.4V3.6" />
      <path d="M12 14.8v2.6M9 21l3-3.6 3 3.6" />
      <path d="m8.4 11.2 2.6-3.1 2 2 2.6-3.3" />
    </Svg>
  );
}

/** Relatórios — folha com dobra e as linhas do texto. */
export function IconeRelatorios(p: Props) {
  return (
    <Svg {...p}>
      <path d="M14 2.8H7.2a1.6 1.6 0 0 0-1.6 1.6v15.2a1.6 1.6 0 0 0 1.6 1.6h9.6a1.6 1.6 0 0 0 1.6-1.6V7.2L14 2.8Z" />
      <path d="M13.8 2.8v4.6h4.6" />
      <path d="M8.8 12.4h6.4M8.8 15.8h6.4M8.8 9h2.4" />
    </Svg>
  );
}

/** Diretriz — a norma: livro aberto com o marcador de página. */
export function IconeDiretriz(p: Props) {
  return (
    <Svg {...p}>
      <path d="M3.4 5.2h5.2a3 3 0 0 1 3 3v11a2.4 2.4 0 0 0-2.4-2.4H3.4V5.2Z" />
      <path d="M20.6 5.2h-5.2a3 3 0 0 0-3 3v11a2.4 2.4 0 0 1 2.4-2.4h5.8V5.2Z" />
      <path d="M17.4 5.2v6l1.6-1.2 1.6 1.2v-6" />
    </Svg>
  );
}

/** Divergências — as duas rotas que se separam, com o alerta no meio. */
export function IconeDivergencias(p: Props) {
  return (
    <Svg {...p}>
      <path d="M12 21.2v-4.4" />
      <path d="M12 16.8 6.4 11.2M12 16.8l5.6-5.6" />
      <path d="M12 2.6 4.8 9.4h14.4L12 2.6Z" />
      <path d="M12 5.8v1.6" />
      <circle cx="12" cy="8.6" r=".55" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Problema do sistema — o triângulo de advertência com a antena cortada: não
 *  é "erro do usuário", é a plataforma que parou de responder. */
export function IconeProblema(p: Props) {
  return (
    <Svg {...p}>
      <path d="M12 3.4 2.9 19.2h18.2L12 3.4Z" />
      <path d="M12 9.6v4.2" />
      <circle cx="12" cy="16.4" r=".6" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Planilha da fração — a grade com a primeira coluna cheia: é a lista de
 *  lançamentos daquela Cia, não um relatório. Menor que o IconeLancamentos
 *  porque aqui ele vive dentro de um botão de 11px na linha da fração. */
export function IconePlanilha(p: Props) {
  return (
    <Svg size={p.size ?? 14} className={p.className}>
      <rect x="3.2" y="4.2" width="17.6" height="15.6" rx="1.8" />
      <path d="M3.2 9h17.6M9 9v10.8" />
    </Svg>
  );
}

/** Lançamentos — a planilha: cabeçalho preenchido e a grade das linhas. */
export function IconeLancamentos(p: Props) {
  return (
    <Svg {...p}>
      <rect x="3" y="4.4" width="18" height="15.2" rx="1.6" />
      <path d="M3 9h18" />
      <path d="M9.6 9v10.6M15 9v10.6" />
      <path d="M3 14.3h18" />
    </Svg>
  );
}

/* ------------------------------------------------- telas de administração */

/** Autorizados — quem abre o painel: pessoa com a chave de acesso. */
export function IconeAutorizados(p: Props) {
  return (
    <Svg {...p}>
      <circle cx="9.4" cy="8" r="3.4" />
      <path d="M3.4 20.4a6 6 0 0 1 10.3-4.2" />
      <circle cx="17.4" cy="16.6" r="2.2" />
      <path d="M19 15.1 21.4 12.7M20.1 14l1 1" />
    </Svg>
  );
}

/** Auditores — o crachá do vínculo conta↔RE. */
export function IconeAuditores(p: Props) {
  return (
    <Svg {...p}>
      <rect x="3.4" y="4.6" width="17.2" height="15" rx="2" />
      <circle cx="9" cy="11" r="2.2" />
      <path d="M5.6 16.6a3.8 3.8 0 0 1 6.8 0" />
      <path d="M14.6 9.8h4M14.6 13.2h4" />
    </Svg>
  );
}

/** Metas — o alvo com a flecha no centro. */
export function IconeMetas(p: Props) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.4" />
      <circle cx="12" cy="12" r="4.6" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <path d="m17.6 6.4 3-3M18.6 3.4h2v2" />
    </Svg>
  );
}

/** Unidades — o organograma Comando → Batalhão → Fração. */
export function IconeUnidades(p: Props) {
  return (
    <Svg {...p}>
      <rect x="9" y="2.8" width="6" height="4.2" rx="1" />
      <rect x="2.8" y="16.8" width="5.6" height="4.2" rx="1" />
      <rect x="15.6" y="16.8" width="5.6" height="4.2" rx="1" />
      <path d="M12 7v4.6M5.6 16.8v-2.6h12.8v2.6M12 11.6v2.6" />
    </Svg>
  );
}

/** Trilha — o histórico: relógio com a seta que volta. */
export function IconeTrilha(p: Props) {
  return (
    <Svg {...p}>
      <path d="M3.6 12a8.4 8.4 0 1 0 2.6-6.1" />
      <path d="M3.4 4.6v3.8h3.8" />
      <path d="M12 7.8V12l3 1.8" />
    </Svg>
  );
}

/** Importar — a carga que entra na base. */
export function IconeImportar(p: Props) {
  return (
    <Svg {...p}>
      <path d="M12 3.4v9.8" />
      <path d="m8.4 9.8 3.6 3.6 3.6-3.6" />
      <path d="M4.4 15.4v3.2a2 2 0 0 0 2 2h11.2a2 2 0 0 0 2-2v-3.2" />
    </Svg>
  );
}

/** Saúde — o pulso das invariantes do painel. */
export function IconeSaude(p: Props) {
  return (
    <Svg {...p}>
      <path d="M3 12.4h3.6l1.8-4.6 3.2 9 2.2-5.4 1.4 3H21" />
    </Svg>
  );
}

/** Ajuda — o balão do WhatsApp com o fone dentro. */
export function IconeWhatsApp(p: Props) {
  return (
    <Svg {...p}>
      <path d="M20.4 11.6a8.3 8.3 0 0 1-12.3 7.3L3.6 20.4l1.5-4.4a8.3 8.3 0 1 1 15.3-4.4Z" />
      <path d="M9.4 8.6c-.5.5-.6 1.3-.2 2a7.4 7.4 0 0 0 3.4 3.4c.7.4 1.5.3 2-.2l.5-.5-1.9-1.3-.8.6a5 5 0 0 1-1.6-1.6l.6-.8-1.3-1.9-.7.3Z" />
    </Svg>
  );
}

/** Instagram — a câmera quadrada, mesmo traço do ícone da vitrine pública. */
export function IconeInstagram(p: Props) {
  return (
    <Svg {...p}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="3.8" />
      <circle cx="17.2" cy="6.8" r="1.05" fill="currentColor" stroke="none" />
    </Svg>
  );
}
