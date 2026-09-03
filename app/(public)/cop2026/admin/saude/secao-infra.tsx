import { Check, Database, Server, TriangleAlert } from "lucide-react";

import { fichaInfra, ultimasExecucoes } from "@/lib/cop2026-infra";
import { resumoDaDimensao } from "@/lib/db/cop2026-unidade";

/**
 * Ficha técnica: onde o sistema mora e se as rotinas estão vivas.
 *
 * Server component separado do `PainelSaude` (que é client, por causa do botão
 * de atualizar): os dados daqui vêm de `server-only` e não têm por que
 * atravessar a fronteira do navegador.
 *
 * REGRA: nome, endereço e estado. **Nunca chave.** Nada nesta tela pode ser
 * usado para acessar coisa nenhuma.
 */

const QUANDO = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/**
 * Quantas horas uma rotina pode passar sem rodar antes de virar alerta.
 * Backup é diário; a esteira roda a cada deploy e pode passar dias parada sem
 * que isso signifique problema, então tem folga maior.
 */
const VALIDADE_HORAS: Record<string, number> = { backup: 30 };
const VALIDADE_PADRAO_HORAS = 24 * 14;

function Linha({ r, v, nota }: { r: string; v: string; nota?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-borda/60 py-1.5 last:border-0">
      <span className="text-[12.5px] text-texto-suave">{r}</span>
      <span className="dados text-[12.5px] font-bold text-branco">{v}</span>
      {nota && <span className="w-full text-[11px] text-texto-suave/70">{nota}</span>}
    </div>
  );
}

export async function SecaoInfra() {
  const [ficha, execucoes, dimensao] = await Promise.all([
    Promise.resolve(fichaInfra()),
    ultimasExecucoes(),
    resumoDaDimensao(),
  ]);

  const { banco, aplicacao } = ficha;

  return (
    <section className="mx-auto max-w-[1100px] space-y-4 px-5 pb-10">
      <div>
        <h2 className="rotulo-dado text-texto-suave">Infraestrutura</h2>
        <p className="mt-1 max-w-3xl text-[12px] leading-snug text-texto-suave/80">
          Onde o sistema mora e de qual base ele está lendo neste momento. Só nome, endereço e
          estado — nenhuma chave aparece aqui, nem mascarada.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* ------------------------------------------------------ banco */}
        <div className="rounded-xl border border-borda bg-tatico-super p-4">
          <div className="flex items-center gap-2">
            <Database size={14} className="text-ouro" />
            <h3 className="text-[12.5px] font-black uppercase tracking-wide text-branco/85">
              Banco de dados
            </h3>
          </div>
          <div className="mt-2">
            <Linha r="Plataforma" v="Supabase (PostgreSQL 17)" />
            <Linha r="Projeto" v={banco.projeto ?? "—"} />
            <Linha r="Host" v={banco.host ?? "—"} />
            <Linha r="Região" v={banco.regiao} />
            <Linha
              r="Conexão"
              v={banco.configurado ? "configurada" : "AUSENTE"}
              nota={
                banco.configurado
                  ? undefined
                  : "Sem credencial o painel cai para a planilha e o formulário não grava."
              }
            />
            <Linha
              r="Árvore de unidades"
              v={`${dimensao.cpas} comandos · ${dimensao.batalhoes} batalhões · ${dimensao.fracoes} frações`}
              nota={
                dimensao.cpasSemNome > 0
                  ? `${dimensao.cpasSemNome} comando(s) ainda sem nome — ver Unidades.`
                  : undefined
              }
            />
          </div>
        </div>

        {/* -------------------------------------------------- aplicação */}
        <div className="rounded-xl border border-borda bg-tatico-super p-4">
          <div className="flex items-center gap-2">
            <Server size={14} className="text-ouro" />
            <h3 className="text-[12.5px] font-black uppercase tracking-wide text-branco/85">
              Aplicação
            </h3>
          </div>
          <div className="mt-2">
            {/* A pergunta das 23h: de onde o painel está lendo AGORA. */}
            <Linha
              r="Fonte dos números"
              v={aplicacao.fonte.toUpperCase()}
              nota={
                aplicacao.fonte === "planilha"
                  ? "Planilha do Google manda no painel; o formulário grava no banco em paralelo."
                  : aplicacao.fonte === "uniao"
                    ? `Planilha até ${aplicacao.corteDoBanco ?? "o corte"}, banco a partir dele.`
                    : "Só o banco."
              }
            />
            <Linha r="Batalhão desta instalação" v={aplicacao.batalhao} />
            <Linha r="Ambiente" v={aplicacao.ambiente} />
            <Linha r="Região da função" v={aplicacao.regiaoDaFuncao ?? "—"} />
            <Linha r="Commit publicado" v={aplicacao.commit ?? "—"} />
            <Linha
              r="Deploy"
              v={aplicacao.deployUrl?.replace("https://", "") ?? "—"}
              nota="Este repositório não tem remote git: promover um deploy anterior é o único rollback."
            />
          </div>
        </div>
      </div>

      {/* --------------------------------------------------- rotinas */}
      <div className="rounded-xl border border-borda bg-tatico-super p-4">
        <h3 className="text-[12.5px] font-black uppercase tracking-wide text-branco/85">
          Rotinas — última execução
        </h3>

        {execucoes.length === 0 ? (
          <p className="mt-2 text-[12.5px] text-texto-suave">
            Nenhuma execução registrada ainda. A esteira de verificação e o backup diário do pc2
            gravam aqui; enquanto esta lista estiver vazia, ninguém sabe se o backup está rodando.
          </p>
        ) : (
          <ul className="mt-2">
            {execucoes.map((e) => {
              const validade = VALIDADE_HORAS[e.nome] ?? VALIDADE_PADRAO_HORAS;
              /* Vencida é diferente de falhada, e as duas precisam gritar: rotina
                 que parou de rodar não emite erro nenhum — só envelhece calada. */
              const vencida = e.idadeHoras > validade;
              const ruim = !e.ok || vencida;
              return (
                <li
                  key={e.nome}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-borda/60 py-2 last:border-0"
                >
                  {ruim ? (
                    <TriangleAlert size={13} className="shrink-0 text-vermelho" />
                  ) : (
                    <Check size={13} className="shrink-0 text-ouro" />
                  )}
                  <span className="text-[12.5px] font-semibold text-branco">{e.nome}</span>
                  <span className="dados text-[11.5px] text-texto-suave">
                    {QUANDO.format(new Date(e.quando))}
                    {e.duracaoMs !== null && ` · ${(e.duracaoMs / 1000).toFixed(1)}s`}
                  </span>
                  {vencida && (
                    <span className="dados text-[11.5px] font-bold text-vermelho">
                      há {Math.floor(e.idadeHoras)}h — passou da validade de {validade}h
                    </span>
                  )}
                  {!e.ok && e.detalhe && (
                    <span className="w-full text-[11.5px] text-vermelho">{e.detalhe}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
