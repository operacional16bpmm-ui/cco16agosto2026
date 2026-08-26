/**
 * Ícones próprios da Auditoria de COP, desenhados para esta página.
 * Grade de 48×48, traço de 1.6 no contorno e 1.2 no detalhe interno, cantos
 * de 2px — assim os quatro cartões têm o mesmo peso visual, coisa que uma
 * biblioteca genérica não entrega (lá cada símbolo vem de um desenho diferente).
 * Todos herdam `currentColor`; o acento usa o segundo tom via `opacity`.
 */
type Props = { size?: number; className?: string };

const base = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: "0 0 48 48",
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className,
  "aria-hidden": true,
});

/** Prancheta de serviço com a câmera operacional portátil e o visto do turno. */
export function IconeLancarAuditoria({ size = 48, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 9h24a3 3 0 0 1 3 3v27a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3Z" />
      <path d="M19 6h10a2 2 0 0 1 2 2v3H17V8a2 2 0 0 1 2-2Z" fill="currentColor" opacity=".18" />
      <path d="M19 6h10a2 2 0 0 1 2 2v3H17V8a2 2 0 0 1 2-2Z" />
      <rect x="14.5" y="18" width="19" height="11" rx="2.5" />
      <circle cx="24" cy="23.5" r="3.4" strokeWidth="1.2" />
      <circle cx="24" cy="23.5" r="1.1" fill="currentColor" stroke="none" />
      <path d="M29.8 20.4h1.6" strokeWidth="1.2" />
      <path d="M15 34h12" strokeWidth="1.2" />
      <path d="M15 38h8" strokeWidth="1.2" opacity=".6" />
      <path d="M28.5 36.8l2.6 2.6 5-5.6" strokeWidth="2" />
    </svg>
  );
}

/** Planilha de controle: grade com a coluna somada e o lacre de acesso. */
export function IconePlanilha({ size = 48, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <rect x="7" y="9" width="34" height="30" rx="3" />
      <path d="M7 17h34" />
      <path d="M18 17v22M29 17v22" strokeWidth="1.2" opacity=".7" />
      <path d="M7 25h34M7 32h34" strokeWidth="1.2" opacity=".7" />
      <rect x="29" y="25" width="12" height="7" fill="currentColor" opacity=".15" stroke="none" />
      <path d="M11 13h5" strokeWidth="1.2" opacity=".6" />
      <path d="M31.5 41v-2.2a3.5 3.5 0 0 1 7 0V41" strokeWidth="1.4" />
      <rect x="29.5" y="41" width="11" height="6" rx="1.6" fill="currentColor" opacity=".18" />
      <rect x="29.5" y="41" width="11" height="6" rx="1.6" strokeWidth="1.4" />
    </svg>
  );
}

/** Painel de controle: barras, linha de tendência e o alvo da meta. */
export function IconeDashboard({ size = 48, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <rect x="6" y="8" width="36" height="28" rx="3" />
      <path d="M6 14h36" />
      <circle cx="10" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="13.5" cy="11" r="1" fill="currentColor" stroke="none" />
      <rect x="11" y="24" width="4.5" height="7" rx="1" fill="currentColor" opacity=".2" />
      <rect x="11" y="24" width="4.5" height="7" rx="1" strokeWidth="1.2" />
      <rect x="18.5" y="20" width="4.5" height="11" rx="1" fill="currentColor" opacity=".2" />
      <rect x="18.5" y="20" width="4.5" height="11" rx="1" strokeWidth="1.2" />
      <rect x="26" y="26" width="4.5" height="5" rx="1" strokeWidth="1.2" />
      <path d="M11 22.5l7.5-5 7 4 8-7" strokeWidth="1.4" />
      <circle cx="33.5" cy="14.5" r="1.8" fill="currentColor" stroke="none" />
      <path d="M18 40h12M24 36v4" strokeWidth="1.4" />
    </svg>
  );
}

/** Briefing: tela de projeção com o slide de resultado e o feixe do projetor. */
export function IconeBriefing({ size = 48, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M24 5v4" strokeWidth="1.4" />
      <rect x="7" y="9" width="34" height="23" rx="2.5" />
      <path d="M24 32v6" strokeWidth="1.4" />
      <path d="M17 43l7-5 7 5" strokeWidth="1.4" />
      <path d="M13 26.5l6-6.5 5.5 4.5 8-9" strokeWidth="1.4" />
      <circle cx="32.5" cy="15" r="1.7" fill="currentColor" stroke="none" />
      <path d="M13 15h6" strokeWidth="1.2" opacity=".6" />
      <path d="M13 19h3.5" strokeWidth="1.2" opacity=".45" />
    </svg>
  );
}

/** Cadeado de acesso restrito, com o brasão vazado no corpo. */
export function IconeRestrito({ size = 20, className }: Props) {
  return (
    <svg {...base(size, className)} strokeWidth={2}>
      <path d="M15 21v-5a9 9 0 0 1 18 0v5" />
      <rect x="9" y="21" width="30" height="20" rx="4" fill="currentColor" opacity=".16" stroke="none" />
      <rect x="9" y="21" width="30" height="20" rx="4" />
      <path d="M24 28v6" />
    </svg>
  );
}

/** Norma: documento com selo lacrado e fita — a diretriz assinada. */
export function IconeDiretriz({ size = 48, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M11 5h17l9 9v29a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <path d="M28 5v7a2 2 0 0 0 2 2h7" />
      <path d="M15 21h13M15 26h18M15 31h10" strokeWidth="1.2" opacity=".7" />
      <circle cx="31" cy="34" r="5.5" fill="currentColor" opacity=".16" stroke="none" />
      <circle cx="31" cy="34" r="5.5" strokeWidth="1.4" />
      <path d="M28.6 38.6l-1.1 5 3.5-2 3.5 2-1.1-5" strokeWidth="1.4" />
      <path d="M29 34l1.5 1.6 3-3.2" strokeWidth="1.4" />
    </svg>
  );
}
