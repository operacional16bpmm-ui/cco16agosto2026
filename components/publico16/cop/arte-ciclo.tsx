/**
 * Arte da virada de ciclo — as três peças gráficas da faixa de mês.
 *
 * Tudo aqui é vetor e gradiente, desenhado no componente: nenhum arquivo de
 * imagem, nenhuma fonte nova, nenhum JavaScript no cliente. É componente de
 * servidor puro de propósito — a tropa abre esta página no 4G da viatura, e a
 * peça que chama a atenção não pode ser a peça que segura o carregamento.
 *
 * A linguagem visual é a do próprio Batalhão: o selo é uma medalha de metal
 * escovado com microtexto gravado, na mesma família do emblema "16º BPM/M ·
 * AUDITORIA COP 2026" que já está no cabeçalho — não um adorno genérico. A cor
 * é a paleta homologada (vermelho #ca0202, azul-noite #07182d); o dourado ficou
 * de fora porque o emblema real do projeto é gunmetal, não ouro.
 *
 * O movimento está em `app/globals.css`, seção "VIRADA DE CICLO", e morre
 * inteiro em `prefers-reduced-motion`.
 */

import { Check } from "lucide-react";

/* ---------------------------------------------------------------------------
 * Aurora — o fundo da faixa
 * ------------------------------------------------------------------------- */

/**
 * Duas manchas de luz (vermelho do Batalhão à esquerda, azul-bandeira à
 * direita) respirando sobre a malha técnica. A malha é mascarada por uma
 * elipse para não virar papel quadriculado: ela some antes de chegar no texto.
 */
export function AuroraCiclo() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="mc-aurora absolute -left-[12%] -top-[45%] h-[190%] w-[70%] rounded-full blur-3xl"
        style={{ background: "radial-gradient(closest-side, rgba(202,2,2,0.5), transparent 72%)" }}
      />
      <div
        className="mc-aurora absolute -right-[14%] -top-[35%] h-[175%] w-[62%] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(closest-side, rgba(48,83,136,0.55), transparent 72%)",
          animationDelay: "-8s",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "62px 62px",
          maskImage: "radial-gradient(ellipse at 50% 0%, #000 10%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 0%, #000 10%, transparent 78%)",
        }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Selo do mês — a medalha
 * ------------------------------------------------------------------------- */

export type EstadoSelo = "encerrado" | "em-curso" | "aguardando";

const MICROTEXTO: Record<EstadoSelo, string> = {
  encerrado: "AUDITORIA DE COP · 16º BPM/M · PERÍODO ENCERRADO · DIRETRIZ PM3-001/02/25 · ",
  "em-curso": "AUDITORIA DE COP · 16º BPM/M · PERÍODO EM CURSO · DIRETRIZ PM3-001/02/25 · ",
  aguardando: "AUDITORIA DE COP · 16º BPM/M · CONSOLIDAÇÃO PENDENTE · DIRETRIZ PM3-001/02/25 · ",
};

/**
 * Medalha do mês, 200×200 no viewBox e do tamanho que o chamador pedir.
 *
 * Os `id` dos gradientes têm de ser únicos no documento — dois selos na mesma
 * página com o mesmo `id` fazem o segundo herdar o gradiente do primeiro. Por
 * isso a `chave`, que por padrão é mês+ano e só precisa ser passada à mão se
 * o mesmo mês aparecer duas vezes na mesma tela.
 */
export function SeloMes({
  abrev,
  ano,
  estado = "encerrado",
  tamanho = 132,
  chave,
  className = "",
}: {
  abrev: string;
  ano: number;
  estado?: EstadoSelo;
  tamanho?: number;
  chave?: string;
  className?: string;
}) {
  const id = (chave ?? `${abrev}${ano}`).toLowerCase().replace(/[^a-z0-9]/g, "");
  const metal = `selo-metal-${id}`;
  const fundo = `selo-fundo-${id}`;
  const foil = `selo-foil-${id}`;
  const volta = `selo-volta-${id}`;

  // Abaixo de ~90px o microtexto do anel não é mais texto, é chiado cinza — e
  // 72 traços viram uma serrilha borrada. Nessa escala o selo vira uma versão
  // limpa de si mesmo: sem anel escrito, com metade dos traços e o núcleo
  // ampliado, para que "AGO 2026" continue legível em 56px no cartão do hub.
  const compacto = tamanho < 90;

  // Traços gravados na borda. A cada terceiro o risco é mais longo e mais
  // claro: é o que dá ritmo de moeda cunhada em vez de serrilha de engrenagem.
  const passo = compacto ? 10 : 5;
  const tracos = Array.from({ length: 360 / passo }, (_, i) => {
    const marco = i % 3 === 0;
    return { angulo: i * passo, r1: marco ? 78 : 82, opacidade: marco ? 0.5 : 0.22 };
  });

  return (
    <svg
      viewBox="0 0 200 200"
      width={tamanho}
      height={tamanho}
      role="img"
      aria-label={`Selo do período de ${abrev}/${ano}`}
      className={className}
    >
      <defs>
        <linearGradient id={metal} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#eaf1f8" />
          <stop offset="34%" stopColor="#93a5ba" />
          <stop offset="58%" stopColor="#4b5b70" />
          <stop offset="100%" stopColor="#c8d5e2" />
        </linearGradient>
        <radialGradient id={fundo} cx="42%" cy="32%" r="78%">
          <stop offset="0%" stopColor="#20303f" />
          <stop offset="55%" stopColor="#0c1523" />
          <stop offset="100%" stopColor="#05080f" />
        </radialGradient>
        <linearGradient id={foil} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff6a6a" />
          <stop offset="45%" stopColor="#ca0202" />
          <stop offset="100%" stopColor="#6d0000" />
        </linearGradient>
        {/* Trajeto do microtexto gravado. Fica no defs; quem gira é o <g> que
            desenha o texto, não o caminho. */}
        <path
          id={volta}
          fill="none"
          d="M 100,100 m -68,0 a 68,68 0 1,1 136,0 a 68,68 0 1,1 -136,0"
        />
      </defs>

      <circle cx="100" cy="100" r="97" fill={`url(#${metal})`} />
      <circle cx="100" cy="100" r="90" fill={`url(#${fundo})`} />
      <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />

      <g stroke="#e8eef6">
        {tracos.map((t) => (
          <line
            key={t.angulo}
            x1="100"
            y1={100 - 86}
            x2="100"
            y2={100 - t.r1}
            strokeWidth="1.4"
            strokeOpacity={t.opacidade}
            transform={`rotate(${t.angulo} 100 100)`}
          />
        ))}
      </g>

      {/* Microtexto gravado, uma volta a cada 72s — devagar o bastante para ler
          como brasão e não como spinner de carregamento. */}
      {!compacto && (
        <g className="mc-anel">
          <text
            fill="#dbe6f2"
            fillOpacity="0.42"
            fontSize="8.2"
            letterSpacing="2.6"
            style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontWeight: 700 }}
          >
            <textPath href={`#${volta}`}>{MICROTEXTO[estado]}</textPath>
          </text>
        </g>
      )}

      {/* Núcleo: louros, mês e ano. No selo compacto o grupo inteiro é ampliado
          a partir do centro — é a mesma peça, só que ocupando o espaço que o
          anel escrito deixou vago. */}
      <g
        transform={
          compacto ? "translate(100 100) scale(1.34) translate(-100 -100)" : undefined
        }
      >
        {/* Louros: arcos vermelhos abraçando o núcleo, abertos em cima para o
            mês respirar. */}
        <circle
          cx="100"
          cy="100"
          r="56"
          fill="none"
          stroke={`url(#${foil})`}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeDasharray="128 24"
          transform="rotate(-90 100 100)"
        />
        <circle cx="100" cy="100" r="49" fill="rgba(255,255,255,0.035)" />
        <circle cx="100" cy="100" r="49" fill="none" stroke="rgba(255,255,255,0.14)" />

        <text
          x="100"
          y="97"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="34"
          style={{ fontFamily: "var(--font-cinzel), Georgia, serif", fontWeight: 700 }}
        >
          {abrev}
        </text>
        <text
          x="100"
          y="118"
          textAnchor="middle"
          fill="#ff8a8a"
          fontSize="14"
          letterSpacing="3"
          style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontWeight: 700 }}
        >
          {ano}
        </text>

        {/* Barra do estado, na base do núcleo: o selo diz sozinho se o período
            fechou, sem depender da legenda ao lado. */}
        <rect
          x="72"
          y="126"
          width="56"
          height="3"
          rx="1.5"
          fill={estado === "em-curso" ? "#ffffff" : `url(#${foil})`}
          fillOpacity={estado === "aguardando" ? 0.4 : 1}
        />
      </g>
    </svg>
  );
}

/* ---------------------------------------------------------------------------
 * Trilha dos dias — a arte que é dado
 * ------------------------------------------------------------------------- */

/**
 * Os dias do mês como uma faixa de barras: o que já correu acende em vermelho,
 * hoje é a barra branca que pulsa, o que falta fica em brasa apagada.
 *
 * A altura de cada barra vem de `(i * 29) % 33`, não de sorteio: precisa ser a
 * mesma no servidor e no cliente, senão a hidratação acusa diferença. Ela é
 * decoração — a informação verdadeira é a cor, e ela está escrita por extenso
 * na legenda que acompanha a peça.
 */
export function TrilhaDias({
  total,
  dia,
  className = "",
}: {
  total: number;
  dia: number;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={`flex h-16 items-end gap-[3px] ${className}`}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const corrido = n < dia;
        const hoje = n === dia;
        // Na véspera (`dia === 0`) nenhuma barra é hoje: o dia 1º fica marcado
        // em vermelho para a trilha não ficar uma fileira morta de 30 traços.
        const abre = dia === 0 && n === 1;
        const altura = hoje ? 100 : abre ? 92 : 44 + ((i * 29) % 34);
        // A cor vai toda no `style`, não em classe utilitária: são valores
        // arbitrários que só existem nesta peça, e classe arbitrária depende do
        // scanner do Tailwind reencontrar a string a cada build.
        const fundo = hoje
          ? "#ffffff"
          : abre
            ? "linear-gradient(to top, #a30000, #ff6b6b)"
            : corrido
              ? "linear-gradient(to top, #7d0000, #ff4b4b)"
              : "rgba(255,255,255,0.13)";
        return (
          <span
            key={n}
            className={`mc-dia flex-1 rounded-t-[2px]${hoje || abre ? " mc-dia-hoje" : ""}`}
            style={{
              height: `${altura}%`,
              background: fundo,
              // O atraso escalona a entrada da esquerda para a direita, que é a
              // ordem em que o mês corre.
              ["--mc-d" as string]: `${i * 16}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Etiqueta de estado
 * ------------------------------------------------------------------------- */

/** Pastilha "período encerrado" / "em curso", na mesma família do hub. */
export function EtiquetaCiclo({ estado }: { estado: EstadoSelo }) {
  if (estado === "em-curso") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
        <span className="mc-dia-hoje h-1.5 w-1.5 rounded-full bg-white" />
        Período em curso
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ca0202]/45 bg-[#ca0202]/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#ff9b9b]">
      <Check className="h-3 w-3" />
      {estado === "encerrado" ? "Período encerrado" : "Consolidação pendente"}
    </span>
  );
}
