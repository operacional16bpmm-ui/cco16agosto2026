import { num, pctTexto } from "@/lib/dejem-calculo";

/**
 * Fluxograma do ciclo da vaga de DEJEM, do que o CPA/M-5 oferta ao que vira
 * policiamento na rua.
 *
 * SVG renderizado no servidor, sem JavaScript no cliente: é diagrama, não
 * interação, e assim aparece igual em impressão e em captura de tela.
 *
 * Duas decisões de honestidade que o desenho precisa carregar:
 *
 * 1. A inscrição NÃO é uma etapa do fluxo. São 2,25 inscrições por vaga, então
 *    encadeá-la entre "ofertada" e "escalada" faria o diagrama sugerir uma
 *    perda de milhares que não existe. Ela entra como pressão lateral, com
 *    seta apontando PARA o fluxo, não ao longo dele.
 * 2. O último salto, de "presente" para "jornada confirmada", vem de outro
 *    relatório, com outro grão. A diferença é de base, não de perda, e por
 *    isso a seta ali é tracejada e rotulada como troca de fonte.
 */

type Props = {
  vagas: number;
  inscritos: number;
  escalados: number;
  presentes: number;
  confirmadas: number;
  ociosasComInscrito: number;
  ociosasSemInscrito: number;
  faltas: number;
  taxaEscalacao: number | null;
  taxaPresenca: number | null;
  inscricoesPorVaga: number | null;
};

const AZUL_NOITE = "#16294a";
const AZUL = "#305388";
const OURO = "#ab9142";
const VERMELHO = "#d53441";
const BORDA = "rgba(35,30,36,0.14)";
const SUAVE = "#55535e";

export function Fluxograma(p: Props) {
  // Largura das caixas proporcional ao valor, com piso para o rótulo caber.
  const larguraDe = (v: number) => Math.max(120, Math.round((v / Math.max(1, p.vagas)) * 300));

  const etapas = [
    { rotulo: "Vagas ofertadas", valor: p.vagas, cor: AZUL_NOITE, x: 40 },
    { rotulo: "PMs escalados", valor: p.escalados, cor: AZUL, x: 400 },
    { rotulo: "Presença confirmada", valor: p.presentes, cor: OURO, x: 760 },
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border border-borda bg-branco p-6 shadow-inst">
      <svg
        viewBox="0 0 1120 330"
        className="h-auto w-full min-w-[860px]"
        role="img"
        aria-label={`Ciclo da vaga: ${p.vagas} ofertadas, ${p.escalados} escaladas, ${p.presentes} com presença confirmada e ${p.confirmadas} jornadas pagas.`}
      >
        <defs>
          <marker id="seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={SUAVE} />
          </marker>
          <marker id="seta-perda" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={VERMELHO} />
          </marker>
        </defs>

        {/* Pressão de demanda: entra por cima, não é etapa do fluxo. */}
        <g>
          <rect x="40" y="10" width={larguraDe(p.vagas)} height="36" rx="6" fill="none" stroke={BORDA} strokeDasharray="4 3" />
          <text x={40 + larguraDe(p.vagas) / 2} y="26" textAnchor="middle" fontSize="10.5" fill={SUAVE} letterSpacing="1.4">
            PRESSÃO DE DEMANDA
          </text>
          <text x={40 + larguraDe(p.vagas) / 2} y="40" textAnchor="middle" fontSize="12" fill={AZUL_NOITE} fontWeight="600">
            {num(p.inscritos)} inscrições · {num(p.inscricoesPorVaga, 2)}× por vaga
          </text>
          <line x1={40 + larguraDe(p.vagas) / 2} y1="50" x2={40 + larguraDe(p.vagas) / 2} y2="76" stroke={SUAVE} strokeWidth="1.4" markerEnd="url(#seta)" />
        </g>

        {/* As três etapas reais do fluxo. */}
        {etapas.map((e) => {
          const w = larguraDe(e.valor);
          return (
            <g key={e.rotulo}>
              <rect x={e.x} y="84" width={w} height="76" rx="8" fill={e.cor} />
              <text x={e.x + w / 2} y="118" textAnchor="middle" fontSize="27" fontWeight="600" fill="#fcfeff" fontFamily="var(--font-dados), monospace">
                {num(e.valor)}
              </text>
              <text x={e.x + w / 2} y="140" textAnchor="middle" fontSize="10.5" fill="#fcfeff" opacity="0.82" letterSpacing="0.8">
                {e.rotulo.toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* Transições, com a taxa de conversão sobre a seta. */}
        {[
          { de: 40 + larguraDe(p.vagas), para: 400, taxa: p.taxaEscalacao, texto: "vaga vira escala" },
          { de: 400 + larguraDe(p.escalados), para: 760, taxa: p.taxaPresenca, texto: "escala vira presença" },
        ].map((t, i) => (
          <g key={i}>
            <line x1={t.de + 12} y1="122" x2={t.para - 12} y2="122" stroke={SUAVE} strokeWidth="1.6" markerEnd="url(#seta)" />
            <text x={(t.de + t.para) / 2} y="112" textAnchor="middle" fontSize="13" fontWeight="600" fill={AZUL_NOITE} fontFamily="var(--font-dados), monospace">
              {pctTexto(t.taxa)}
            </text>
            <text x={(t.de + t.para) / 2} y="140" textAnchor="middle" fontSize="10" fill={SUAVE}>
              {t.texto}
            </text>
          </g>
        ))}

        {/* Perdas: descem do fluxo, com a causa nomeada. */}
        {[
          { x: 40 + larguraDe(p.vagas) + 60, valor: p.ociosasComInscrito, causa: "ociosa COM candidato inscrito", forte: true },
          { x: 40 + larguraDe(p.vagas) + 60, valor: p.ociosasSemInscrito, causa: "ociosa sem nenhum inscrito", forte: false, dy: 62 },
          { x: 400 + larguraDe(p.escalados) + 60, valor: p.faltas, causa: "escalado que não compareceu", forte: false },
        ].map((l, i) => (
          <g key={i}>
            <line x1={l.x} y1="160" x2={l.x} y2={190 + (l.dy ?? 0)} stroke={l.forte ? VERMELHO : SUAVE} strokeWidth={l.forte ? 1.8 : 1.2} markerEnd={l.forte ? "url(#seta-perda)" : "url(#seta)"} strokeDasharray={l.forte ? undefined : "3 3"} />
            <text x={l.x + 10} y={200 + (l.dy ?? 0)} fontSize={l.forte ? 19 : 15} fontWeight="600" fill={l.forte ? VERMELHO : SUAVE} fontFamily="var(--font-dados), monospace">
              −{num(l.valor)}
            </text>
            <text x={l.x + 10} y={216 + (l.dy ?? 0)} fontSize="10.5" fill={SUAVE}>
              {l.causa}
            </text>
          </g>
        ))}

        {/* Troca de base: seta tracejada, deliberadamente diferente. */}
        <g>
          <rect x="760" y="248" width={larguraDe(p.confirmadas)} height="60" rx="8" fill="none" stroke={BORDA} strokeWidth="1.4" />
          <text x={760 + larguraDe(p.confirmadas) / 2} y="278" textAnchor="middle" fontSize="21" fontWeight="600" fill={AZUL_NOITE} fontFamily="var(--font-dados), monospace">
            {num(p.confirmadas)}
          </text>
          <text x={760 + larguraDe(p.confirmadas) / 2} y="295" textAnchor="middle" fontSize="10" fill={SUAVE} letterSpacing="0.6">
            JORNADAS PAGAS · {num(p.confirmadas * 8)} HOMENS-HORA
          </text>
          <line x1={760 + larguraDe(p.presentes) / 2} y1="164" x2={760 + larguraDe(p.confirmadas) / 2} y2="244" stroke={SUAVE} strokeWidth="1.2" strokeDasharray="5 4" markerEnd="url(#seta)" />
          <text x={760 + larguraDe(p.confirmadas) / 2 + 14} y="210" fontSize="10" fill={SUAVE}>
            outra fonte: diferença de base,
          </text>
          <text x={760 + larguraDe(p.confirmadas) / 2 + 14} y="224" fontSize="10" fill={SUAVE}>
            não de falta
          </text>
        </g>
      </svg>
    </div>
  );
}
