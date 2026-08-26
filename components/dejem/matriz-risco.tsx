import { num, pctTexto } from "@/lib/dejem-calculo";

/**
 * Matriz de risco do preenchimento da escala.
 *
 * Os dois eixos são CALCULADOS, não atribuídos por opinião:
 *
 *   Severidade (vertical)  = quanto do ofertado se perde naquele recorte,
 *                            ou seja, 100 menos a taxa de preenchimento.
 *                            Responde "quando acontece, quão ruim é".
 *   Exposição (horizontal) = quantas vagas o recorte concentra no semestre.
 *                            Responde "com que frequência o batalhão se
 *                            expõe a esse risco".
 *
 * O produto dos dois é o que importa para decidir: um turno que perde 55% mas
 * só teve 120 vagas custa menos que um que perde 27% em 683. Uma matriz que
 * ordenasse só por percentual mandaria o Comando atacar o lugar errado.
 *
 * Os itens são dias da semana e turnos reais, vindos dos mesmos helpers que
 * alimentam os quadros VII e V. Nada aqui é digitado à mão.
 */

export type ItemRisco = {
  rotulo: string;
  tipo: "dia" | "turno";
  vagas: number;
  perdidas: number;
  preenchimento: number | null;
};

type Faixa = 0 | 1 | 2 | 3;

const CORES: Record<Faixa, { fundo: string; texto: string; nome: string }> = {
  0: { fundo: "bg-[#1d6349]/12", texto: "text-[#1d6349]", nome: "Baixo" },
  1: { fundo: "bg-[#9a6a0e]/14", texto: "text-[#9a6a0e]", nome: "Moderado" },
  2: { fundo: "bg-vermelho/14", texto: "text-vermelho", nome: "Alto" },
  3: { fundo: "bg-vermelho/26", texto: "text-vermelho", nome: "Crítico" },
};

/** 0 a 3 pelo tamanho da queda: <5, <15, <30, resto. */
function faixaSeveridade(perdaPct: number): Faixa {
  if (perdaPct < 5) return 0;
  if (perdaPct < 15) return 1;
  if (perdaPct < 30) return 2;
  return 3;
}

/** 0 a 3 pela fatia da oferta que o recorte concentra. */
function faixaExposicao(vagas: number, total: number): Faixa {
  const share = total ? (vagas / total) * 100 : 0;
  if (share < 4) return 0;
  if (share < 10) return 1;
  if (share < 18) return 2;
  return 3;
}

const ROTULOS_SEV = ["Perda até 5%", "5% a 15%", "15% a 30%", "acima de 30%"];
const ROTULOS_EXP = ["Marginal", "Ocasional", "Frequente", "Dominante"];

export function MatrizRisco({ itens, totalVagas }: { itens: ItemRisco[]; totalVagas: number }) {
  const posicionados = itens
    .filter((i) => i.preenchimento !== null && i.vagas > 0)
    .map((i) => ({
      ...i,
      sev: faixaSeveridade(100 - (i.preenchimento as number)),
      exp: faixaExposicao(i.vagas, totalVagas),
    }));

  const celula = (sev: Faixa, exp: Faixa) => posicionados.filter((p) => p.sev === sev && p.exp === exp);
  // Criticidade da célula: média das duas faixas, arredondada para cima.
  const criticidade = (sev: Faixa, exp: Faixa): Faixa => Math.min(3, Math.ceil((sev + exp) / 2)) as Faixa;

  const linhas: Faixa[] = [3, 2, 1, 0]; // severidade decrescente, pior no topo

  return (
    <div className="rounded-2xl border border-borda bg-branco p-6 shadow-inst">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="rotulo-dado text-vermelho">Matriz de risco do preenchimento</p>
          <p className="mt-1.5 max-w-[62ch] text-[13px] leading-relaxed text-texto-suave">
            Severidade é quanto se perde do ofertado; exposição é quanta vaga o recorte concentra.
            O canto superior direito é onde a perda é grande <em>e</em> acontece em volume.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {([0, 1, 2, 3] as Faixa[]).map((f) => (
            <span key={f} className="flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded-sm ${CORES[f].fundo}`} />
              <span className="rotulo-dado text-texto-suave">{CORES[f].nome}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-[112px_repeat(4,1fr)] gap-1.5">
          <div />
          {ROTULOS_EXP.map((r) => (
            <div key={r} className="rotulo-dado pb-1.5 text-center text-texto-suave">
              {r}
            </div>
          ))}

          {linhas.map((sev) => (
            <div key={sev} className="contents">
              <div className="rotulo-dado flex items-center justify-end pr-2.5 text-right text-texto-suave">
                {ROTULOS_SEV[sev]}
              </div>
              {([0, 1, 2, 3] as Faixa[]).map((exp) => {
                const its = celula(sev, exp);
                const c = CORES[criticidade(sev, exp)];
                return (
                  <div
                    key={exp}
                    className={`min-h-[86px] rounded-lg border border-borda/60 p-2 ${c.fundo}`}
                  >
                    {its.map((i) => (
                      <div key={i.rotulo} className="mb-1.5 last:mb-0">
                        <p className={`text-[12px] font-semibold leading-tight ${c.texto}`}>
                          {i.rotulo}
                        </p>
                        <p className="dados text-[10.5px] text-texto-suave">
                          {num(i.perdidas)} perdidas · {pctTexto(i.preenchimento)}
                        </p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-borda pt-3">
        <span className="rotulo-dado text-texto-suave">Eixo vertical: severidade da perda</span>
        <span className="rotulo-dado text-texto-suave">Eixo horizontal: exposição em volume de vagas</span>
      </div>
    </div>
  );
}
