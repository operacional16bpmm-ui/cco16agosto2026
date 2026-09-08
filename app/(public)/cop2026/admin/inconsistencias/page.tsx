import type { Metadata } from "next";
import { AlertTriangle, ShieldCheck } from "lucide-react";

import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { FaixaCreditos } from "@/components/publico16/creditos";
import { exigirAdminCop } from "@/lib/db/cop2026-autorizados";
import { ROTULO_ABRANGENCIA, ROTULO_EFEITO, ROTULO_SITUACAO } from "@/lib/cop2026-inconsistencia";
import { listarRelatos, resumirPorFracao } from "@/lib/db/cop2026-inconsistencia";
import { telegramConfigurado } from "@/lib/cop2026-telegram";
import { CabecalhoAdmin } from "../cabecalho-admin";

export const metadata: Metadata = {
  title: "Inconsistências do sistema · Auditoria de COP 2026",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * INCONSISTÊNCIAS DO SISTEMA — a apuração dos relatos de indisponibilidade.
 *
 * SEM RECORTE DE MÊS, de propósito, pela mesma razão da tela de divergências:
 * isto é fila de tratamento, não medição de período. Um relato de sexta que só
 * for tratado no mês seguinte não pode sumir da tela na virada — é justamente
 * o caso que se quer não repetir.
 *
 * A COLUNA "AVISOU EM" É O NÚMERO DE COMANDO desta tela. Ela mede a distância
 * entre a hora declarada do problema e a hora em que o aviso chegou ao portal.
 * O episódio que originou o módulo não foi uma queda: foi uma queda de três
 * dias que ninguém comunicou. Contar relatos mede adesão; contar horas até
 * avisar mede a coisa que falhou.
 */
export default async function AdminInconsistenciasPage() {
  const admin = await exigirAdminCop();
  const relatos = await listarRelatos({ limite: 500 });
  const resumo = resumirPorFracao(relatos);

  const abertos = relatos.filter((r) => r.situacao === "aberto" || r.situacao === "em_analise");
  const comPendencia = relatos.filter((r) => r.pendencias.length > 0);
  const lentos = relatos.filter((r) => r.horasAteAvisar >= 6);

  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const nHoras = (h: number) =>
    h < 1 ? "<1h" : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(h)}h`;

  return (
    <div className="tema-institucional min-h-screen bg-tatico-fundo text-[15px] text-branco">
      <FaixaCreditos />
      <CabecalhoAdmin secao="Inconsistências do sistema" email={admin.email} />

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-5">
        {/* O canal de aviso é parte do produto: sem ele, o relato entra e
            ninguém fica sabendo na hora. Se estiver desligado, isso tem de
            aparecer para quem administra — não descoberto na próxima queda. */}
        {!telegramConfigurado() && (
          <p
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-lg border-2 border-sinal-atencao/50 bg-sinal-atencao-suave px-4 py-3 text-[13.5px] leading-relaxed text-sinal-atencao"
          >
            <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              <strong>O aviso automático está desligado.</strong> Os relatos continuam sendo
              gravados, mas ninguém é notificado na hora. Para ligar, defina{" "}
              <code className="dados">COP_TELEGRAM_BOT_TOKEN</code> e{" "}
              <code className="dados">COP_TELEGRAM_CHAT_ID</code> no ambiente do servidor.
            </span>
          </p>
        )}

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { r: "Relatos registrados", v: relatos.length, n: "desde o início do registro" },
            { r: "Em aberto", v: abertos.length, n: "sem encerramento informado" },
            { r: "Avisados com atraso", v: lentos.length, n: "6h ou mais após o início" },
            { r: "Com pendência de forma", v: comPendencia.length, n: "campo fora do padrão" },
          ].map((k) => (
            <div
              key={k.r}
              className="cartao-kpi rounded-xl border-2 border-slate-300/85 bg-gradient-to-b from-white via-[#f8fafc] to-[#edf3f8] p-4"
            >
              <p className="text-[10.5px] font-black uppercase tracking-wider text-texto-suave">
                {k.r}
              </p>
              <p className="dados mt-1 text-3xl font-black leading-none text-branco">{k.v}</p>
              <p className="mt-1 text-[12px] text-texto-suave">{k.n}</p>
            </div>
          ))}
        </div>

        {relatos.length === 0 ? (
          <p className="flex items-start gap-2.5 rounded-lg border-2 border-dashed border-borda px-4 py-6 text-[13.5px] leading-relaxed text-texto-suave">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-sinal-conforme" aria-hidden />
            <span>
              Nenhum relato registrado até aqui. Isso quer dizer que{" "}
              <strong className="text-branco">ninguém avisou</strong> — não que o sistema não tenha
              caído.
            </span>
          </p>
        ) : (
          <>
            <section className="mb-7">
              <h2 className="mb-3 font-serif text-lg font-bold text-branco">Por fração</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b-2 border-slate-300 text-left text-[10.5px] font-black uppercase tracking-wider text-texto-suave">
                      <th className="py-2 pr-3">Fração</th>
                      <th className="py-2 pr-3 text-right">Relatos</th>
                      <th className="py-2 pr-3 text-right">Em aberto</th>
                      <th className="py-2 pr-3 text-right">Tempo sem sistema</th>
                      <th className="py-2">Último início</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumo.map((r) => (
                      <tr key={r.subunidade} className="border-b border-borda/60">
                        <td className="py-2 pr-3 font-bold text-branco">{r.subunidadeRotulo}</td>
                        <td className="dados py-2 pr-3 text-right tabular-nums">{r.relatos}</td>
                        <td className="dados py-2 pr-3 text-right tabular-nums">
                          {r.abertos || "—"}
                        </td>
                        <td className="dados py-2 pr-3 text-right font-bold tabular-nums">
                          {nHoras(r.horasFora)}
                        </td>
                        <td className="dados py-2 text-texto-suave">
                          {r.ultimoInicio ? fmt.format(new Date(r.ultimoInicio)) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="mb-3 font-serif text-lg font-bold text-branco">Relatos</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] border-collapse text-[12.5px]">
                  <thead>
                    <tr className="border-b-2 border-slate-300 text-left text-[10.5px] font-black uppercase tracking-wider text-texto-suave">
                      <th className="py-2 pr-3">Protocolo</th>
                      <th className="py-2 pr-3">Fração</th>
                      <th className="py-2 pr-3">Início</th>
                      <th className="py-2 pr-3">Fim</th>
                      <th className="py-2 pr-3">Alcance</th>
                      <th className="py-2 pr-3">O que parou</th>
                      <th className="py-2 pr-3 text-right">Avisou em</th>
                      <th className="py-2 pr-3">Relator</th>
                      <th className="py-2">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatos.map((r) => (
                      <tr key={r.id} className="border-b border-borda/60 align-top">
                        <td className="dados py-2 pr-3 uppercase">{r.id.slice(0, 8)}</td>
                        <td className="py-2 pr-3 font-bold text-branco">{r.subunidadeRotulo}</td>
                        <td className="dados py-2 pr-3">{fmt.format(new Date(r.inicioEm))}</td>
                        <td className="dados py-2 pr-3">
                          {r.fimEm ? (
                            fmt.format(new Date(r.fimEm))
                          ) : (
                            <span className="font-bold text-[#ca0202]">em curso</span>
                          )}
                        </td>
                        <td className="py-2 pr-3">{ROTULO_ABRANGENCIA[r.abrangencia]}</td>
                        <td className="py-2 pr-3">
                          {r.efeitos.map((e) => ROTULO_EFEITO[e].split(" (")[0]).join(", ")}
                        </td>
                        <td
                          className={`dados py-2 pr-3 text-right tabular-nums ${
                            r.horasAteAvisar >= 6 ? "font-black text-[#ca0202]" : ""
                          }`}
                        >
                          {nHoras(r.horasAteAvisar)}
                        </td>
                        <td className="py-2 pr-3">
                          {r.nome}
                          <span className="dados block text-texto-suave">RE {r.re}</span>
                        </td>
                        <td className="py-2">
                          {ROTULO_SITUACAO[r.situacao]}
                          {r.pendencias.length > 0 && (
                            <span className="mt-1 block text-[11px] leading-snug text-sinal-atencao">
                              {r.pendencias.length} pendência
                              {r.pendencias.length === 1 ? "" : "s"} de forma
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        <p className="mt-8 border-t border-branco/10 pt-4 text-[12.5px] leading-relaxed text-branco/45">
          Esta tela é <strong>fila de tratamento</strong>, não medição de período: por isso não há
          recorte de mês. Um relato só sai daqui quando alguém o encerra. As pendências de forma
          nunca impediram o envio — elas existem para o Comando cobrar a correção, e não para
          invalidar o aviso. Quem avisou, avisou.
        </p>
      </main>

      <RodapeCop nota="Registro de indisponibilidade da COP — documento operacional do 16º BPM/M." />
    </div>
  );
}
