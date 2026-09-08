"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCw,
  Send,
  ShieldAlert,
} from "lucide-react";

import type { RetratoSaude } from "@/lib/cop2026-saude";

/** De quanto em quanto tempo a tela se atualiza sozinha. Cada leitura vai à
 *  planilha, então 60s é o piso razoável — o retrato do painel tem 60s de
 *  validade de qualquer forma (`lib/cop2026-leitura.ts`). */
const INTERVALO_MS = 60_000;

const CORES: Record<string, { borda: string; texto: string; fundo: string; rotulo: string }> = {
  ok: { borda: "border-sinal-conforme/45", texto: "text-sinal-conforme", fundo: "bg-sinal-conforme-suave", rotulo: "TUDO CERTO" },
  medio: { borda: "border-sinal-atencao/45", texto: "text-sinal-atencao", fundo: "bg-sinal-atencao-suave", rotulo: "ATENÇÃO" },
  alto: { borda: "border-sinal-atencao/60", texto: "text-sinal-atencao", fundo: "bg-sinal-atencao-suave", rotulo: "ALTO" },
  critico: { borda: "border-sinal-critico/55", texto: "text-sinal-critico", fundo: "bg-sinal-critico-suave", rotulo: "CRÍTICO" },
};

const GRAVIDADE: Record<string, { cor: string; rotulo: string }> = {
  critico: { cor: "text-sinal-critico border-sinal-critico/50 bg-sinal-critico-suave", rotulo: "CRÍTICO" },
  alto: { cor: "text-sinal-atencao border-sinal-atencao/50 bg-sinal-atencao-suave", rotulo: "ALTO" },
  medio: { cor: "text-texto-suave border-borda bg-branco/[0.02]", rotulo: "MÉDIO" },
};

const N = new Intl.NumberFormat("pt-BR");

type Turno = { papel: "user" | "assistant"; texto: string };

export function PainelSaude({
  inicial,
  assistenteAtivo,
}: {
  inicial: RetratoSaude;
  assistenteAtivo: boolean;
}) {
  const [saude, setSaude] = useState<RetratoSaude>(inicial);
  const [atualizando, setAtualizando] = useState(false);
  const [erroLeitura, setErroLeitura] = useState<string | null>(null);
  const [atualizadoEm, setAtualizadoEm] = useState<string>("");

  async function atualizar() {
    setAtualizando(true);
    try {
      const r = await fetch("/api/cop2026/saude/painel", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setSaude(await r.json());
      setErroLeitura(null);
      setAtualizadoEm(
        new Intl.DateTimeFormat("pt-BR", {
          timeZone: "America/Sao_Paulo",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date())
      );
    } catch (e) {
      setErroLeitura(e instanceof Error ? e.message : "falha ao atualizar");
    } finally {
      setAtualizando(false);
    }
  }

  useEffect(() => {
    const t = setInterval(atualizar, INTERVALO_MS);
    return () => clearInterval(t);
  }, []);

  const c = CORES[saude.status] ?? CORES.medio;
  const p = saude.painel;

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-5 py-8">
      {/* -------------------------------------------------- selo geral */}
      <section className={`rounded-xl border-2 ${c.borda} ${c.fundo} p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {saude.ok ? (
              <CheckCircle2 size={30} className={c.texto} aria-hidden />
            ) : (
              <ShieldAlert size={30} className={c.texto} aria-hidden />
            )}
            <div>
              <p className={`text-[11px] font-bold uppercase tracking-[0.16em] ${c.texto}`}>
                {c.rotulo}
              </p>
              <h1 className="mt-0.5 font-serif text-xl font-bold uppercase tracking-wide text-branco">
                {saude.ok
                  ? "Nenhuma invariante quebrada"
                  : `${saude.achados.length} achado(s) aberto(s)`}
              </h1>
              <p className="mt-1 text-[12.5px] text-texto-suave">
                Ciclo de <strong className="text-branco">{saude.mes ?? "—"}</strong> · leitura da
                base em <span className="dados">{saude.lidoEm}</span>
                {saude.stale && (
                  <span className="ml-2 rounded border border-sinal-atencao/40 px-1.5 py-0.5 text-[11px] text-sinal-atencao">
                    servindo último retrato bom
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="text-right">
            <button
              type="button"
              onClick={atualizar}
              disabled={atualizando}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-borda px-3 py-2 text-[12.5px] font-bold uppercase tracking-wide text-branco transition-colors hover:border-vermelho/40 disabled:opacity-50"
            >
              {atualizando ? (
                <Loader2 size={14} className="animate-spin" aria-hidden />
              ) : (
                <RefreshCw size={14} aria-hidden />
              )}
              Atualizar
            </button>
            <p className="mt-1.5 text-[11px] text-texto-suave">
              {erroLeitura
                ? `falha: ${erroLeitura}`
                : atualizadoEm
                  ? `atualizado às ${atualizadoEm}`
                  : `atualiza a cada ${INTERVALO_MS / 1000}s`}
            </p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- achados */}
      <section className="space-y-3">
        <h2 className="rotulo-dado text-texto-suave">Invariantes</h2>
        {saude.achados.length === 0 ? (
          <p className="rounded-lg border border-dashed border-borda px-4 py-6 text-center text-[13px] text-texto-suave">
            As dez invariantes do painel fecham. Nada a cobrar agora.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {saude.achados.map((a) => {
              const g = GRAVIDADE[a.gravidade] ?? GRAVIDADE.medio;
              return (
                <li key={a.chave} className={`rounded-lg border px-4 py-3 ${g.cor}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <AlertTriangle size={14} aria-hidden />
                    <span className="text-[10.5px] font-black uppercase tracking-[0.14em]">
                      {g.rotulo}
                    </span>
                    <code className="rounded bg-branco/[0.06] px-1.5 py-0.5 text-[11px]">
                      {a.chave}
                    </code>
                  </div>
                  <p className="mt-1.5 text-[13.5px] font-semibold text-branco">{a.descricao}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-texto-suave">
                    <strong className="text-branco/80">O que fazer:</strong> {a.acao}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* -------------------------------------------------- números */}
      <section className="space-y-3">
        <h2 className="rotulo-dado text-texto-suave">Retrato do ciclo</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Metrica rotulo="Meta do mês" valor={`${N.format(p.total)} / ${N.format(p.meta)}`} nota={`${p.pct}%`} />
          <Metrica rotulo="Calendário" valor={`dia ${p.diaDoMes} de ${p.diasNoMes}`} nota={`faltam ${p.diasRestantes}`} />
          <Metrica rotulo="Ritmo alvo" valor={`${p.metaDia}/dia`} nota={`necessário ${p.ritmoNecessarioDia}/dia`} />
          <Metrica rotulo="Mínimo por turno" valor={String(p.minimo)} nota="determinação do Batalhão" />
          <Metrica rotulo="Turnos auditados" valor={String(p.turnosAuditados)} nota={`${p.turnosConformes} cumpriram`} />
          <Metrica rotulo="Abaixo do mínimo" valor={String(p.turnosAbaixo)} nota="turnos" alerta={p.turnosAbaixo > 0} />
          {/* Os três indicadores de IDENTIFICADOR continuam medidos, mas SEM
              `alerta` desde 08/09/2026: pela decisão de Comando de 07/09 o ID não
              reprova ninguém, e pintá-los de laranja aqui repetia — na própria tela
              de saúde — o julgamento que foi abolido das telas de desempenho.
              O número fica porque é diagnóstico; a cobrança mora em
              /cop2026/admin/divergencias. */}
          <Metrica rotulo="Sem informar ID" valor={String(p.semIds)} nota="ver Divergências" />
          <Metrica rotulo="ID fora do formato" valor={String(p.comIdInvalido)} nota="ver Divergências" />
          <Metrica rotulo="ID já auditado" valor={String(p.comIdDuplicado)} nota={`${p.idsDuplicadosDistintos} ID distintos`} />
          <Metrica rotulo="Sem fração" valor={String(p.semFracaoVideos)} nota="evidências órfãs" alerta={p.semFracaoVideos > 0} />
          <Metrica rotulo="Linhas em dobro" valor={String(p.linhasEmDobro)} nota="planilha × banco" alerta={p.linhasEmDobro > 0} />
          <Metrica rotulo="Leitura da base" valor={`${(saude.msLeitura / 1000).toFixed(1)}s`} nota={`${N.format(p.totalNaPlanilha)} registros`} alerta={saude.msLeitura > 15000} />
        </div>
      </section>

      {/* -------------------------------------------------- frações */}
      <section className="space-y-3">
        <h2 className="rotulo-dado text-texto-suave">Frações</h2>
        <div className="overflow-x-auto rounded-xl border border-borda bg-tatico-super">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead className="border-b border-borda text-[11px] uppercase tracking-wide text-texto-suave">
              <tr>
                <th className="px-4 py-2.5">Fração</th>
                <th className="px-4 py-2.5 text-right">Feito</th>
                <th className="px-4 py-2.5 text-right">Meta</th>
                <th className="px-4 py-2.5 text-right">%</th>
                <th className="px-4 py-2.5 text-right">Auditores</th>
              </tr>
            </thead>
            <tbody>
              {saude.fracoes.map((f) => (
                <tr key={f.rotulo} className="border-b border-borda/60 last:border-0">
                  <td className="px-4 py-2.5 font-semibold">{f.rotulo}</td>
                  <td className="dados px-4 py-2.5 text-right">{N.format(f.feito)}</td>
                  <td className="dados px-4 py-2.5 text-right text-texto-suave">{N.format(f.meta)}</td>
                  <td className="dados px-4 py-2.5 text-right font-bold">{f.pct}%</td>
                  <td className="dados px-4 py-2.5 text-right text-texto-suave">
                    {f.lancaram} / {f.efetivo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Assistente saude={saude} ativo={assistenteAtivo} />
    </div>
  );
}

function Metrica({
  rotulo,
  valor,
  nota,
  alerta,
}: {
  rotulo: string;
  valor: string;
  nota: string;
  alerta?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3.5 py-3 ${
        alerta ? "border-sinal-atencao/45 bg-sinal-atencao-suave/30" : "border-borda bg-tatico-super"
      }`}
    >
      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-texto-suave">
        {rotulo}
      </p>
      <p className={`dados-destaque mt-1 text-xl ${alerta ? "text-sinal-atencao" : "text-branco"}`}>
        {valor}
      </p>
      <p className="mt-0.5 text-[11.5px] text-texto-suave">{nota}</p>
    </div>
  );
}

/**
 * Pergunta livre sobre o retrato de saúde.
 *
 * É uma instância da API do Claude com o contexto operacional do projeto — NÃO
 * é a sessão de terminal de quem construiu o sistema, e não tem a memória
 * daquelas conversas. O aviso fica na tela, e não só neste comentário, porque a
 * confusão entre as duas coisas leva a pedir aqui o que só se faz lá.
 */
function Assistente({ saude, ativo }: { saude: RetratoSaude; ativo: boolean }) {
  const [conversa, setConversa] = useState<Turno[]>([]);
  const [pergunta, setPergunta] = useState("");
  const [pensando, setPensando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversa, pensando]);

  async function perguntar(texto: string) {
    const limpo = texto.trim();
    if (!limpo || pensando) return;
    setPergunta("");
    setErro(null);
    const historico = conversa;
    setConversa([...historico, { papel: "user", texto: limpo }]);
    setPensando(true);
    try {
      const r = await fetch("/api/cop2026/saude/perguntar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta: limpo, historico, saude }),
      });
      const dados = await r.json();
      if (!r.ok || dados.erro) {
        setErro(dados.detalhe ?? dados.erro ?? `HTTP ${r.status}`);
        setConversa(historico);
        setPergunta(limpo);
        return;
      }
      setConversa((c) => [...c, { papel: "assistant", texto: dados.resposta }]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "falha na chamada");
      setConversa(historico);
      setPergunta(limpo);
    } finally {
      setPensando(false);
    }
  }

  const sugestoes = saude.achados.length
    ? [
        `Explique o achado "${saude.achados[0].chave}" e o risco de deixar como está.`,
        "Quais desses achados o Major perceberia num print? Ordene por urgência.",
        "O ritmo atual fecha a meta do mês? Mostre a conta.",
      ]
    : [
        "O ritmo atual fecha a meta do mês? Mostre a conta.",
        "Qual fração precisa de intervenção primeiro e por quê?",
        "O que ainda não é medido por nenhuma invariante?",
      ];

  return (
    <section className="space-y-3 rounded-xl border border-borda bg-tatico-super p-5">
      <header>
        <h2 className="flex items-center gap-2 font-serif text-lg font-bold uppercase tracking-wide text-branco">
          <Activity size={17} className="text-vermelho" aria-hidden />
          Perguntar sobre o sistema
        </h2>
        <p className="mt-1 flex items-start gap-2 text-[12.5px] leading-relaxed text-texto-suave">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Responde o <strong className="text-branco">Claude</strong>, com o retrato de saúde
            acima e os padrões do Comando como contexto. É uma instância da API — não é a sessão
            de terminal, não tem a memória daquelas conversas e não altera nada aqui.
          </span>
        </p>
      </header>

      {!ativo && (
        <p className="flex items-start gap-2 rounded-lg border border-sinal-atencao/40 bg-sinal-atencao-suave px-4 py-3 text-[12.5px] leading-relaxed text-sinal-atencao">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            Assistente desligado — falta <code>ANTHROPIC_API_KEY</code> no ambiente de produção.
            Para ligar:{" "}
            <code className="rounded bg-branco/[0.06] px-1.5 py-0.5">
              npx vercel env add ANTHROPIC_API_KEY production
            </code>{" "}
            e refazer o deploy.
          </span>
        </p>
      )}

      {conversa.length > 0 && (
        <div className="max-h-[460px] space-y-3 overflow-y-auto rounded-lg border border-borda p-4">
          {conversa.map((t, i) => (
            <div
              key={i}
              className={
                t.papel === "user"
                  ? "ml-auto max-w-[85%] rounded-lg border border-vermelho/35 bg-vermelho/10 px-3.5 py-2.5"
                  : "max-w-[92%] rounded-lg border border-borda bg-branco/[0.02] px-3.5 py-2.5"
              }
            >
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-texto-suave">
                {t.papel === "user" ? "Você" : "Claude"}
              </p>
              <div className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-branco">
                {t.texto}
              </div>
            </div>
          ))}
          {pensando && (
            <p className="flex items-center gap-2 text-[12.5px] text-texto-suave">
              <Loader2 size={14} className="animate-spin" aria-hidden /> pensando…
            </p>
          )}
          <div ref={fim} />
        </div>
      )}

      {erro && (
        <p className="flex items-start gap-2 rounded-lg border border-sinal-critico/40 bg-sinal-critico-suave px-3 py-2 text-[12.5px] text-sinal-critico">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden /> {erro}
        </p>
      )}

      {conversa.length === 0 && ativo && (
        <div className="flex flex-wrap gap-2">
          {sugestoes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => perguntar(s)}
              className="rounded-md border border-borda px-3 py-1.5 text-left text-[12px] text-texto-suave transition-colors hover:border-vermelho/40 hover:text-branco"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          perguntar(pergunta);
        }}
        className="flex flex-wrap items-end gap-2"
      >
        <textarea
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              perguntar(pergunta);
            }
          }}
          rows={2}
          disabled={!ativo || pensando}
          placeholder={
            ativo ? "Pergunte sobre os números, um achado, ou o que fazer agora…" : "Assistente desligado"
          }
          className="min-h-14 flex-1 resize-y rounded-md border border-borda bg-branco/[0.02] px-3 py-2.5 text-[14px] text-branco outline-none placeholder:text-texto-suave/60 focus:border-vermelho/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!ativo || pensando || !pergunta.trim()}
          className="inline-flex min-h-12 items-center gap-2 rounded-md border border-vermelho bg-vermelho/10 px-5 py-3 text-[13px] font-bold uppercase tracking-wide text-vermelho transition-colors hover:bg-vermelho/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pensando ? (
            <Loader2 size={15} className="animate-spin" aria-hidden />
          ) : (
            <Send size={15} aria-hidden />
          )}
          Perguntar
        </button>
      </form>
    </section>
  );
}
