"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  ClipboardList,
  Landmark,
  Loader2,
  Shield,
  Swords,
  Users,
} from "lucide-react";

import type { ArvoreFormulario, OpcaoUnidade } from "@/lib/db/cop2026-unidade";

/**
 * Seletor de unidade do formulário de lançamento — Comando → Batalhão → Fração.
 *
 * POR QUE ELE EXISTE (determinação do Fabricio, 08/09/2026): até aqui a fração
 * do lançamento era DERIVADA do RE, contra a relação do efetivo. Quem foi
 * transferido depois de 19/07 — data em que `p4_efetivo` congelou — lançava e
 * caía na Cia antiga, sem ver e sem poder corrigir. Agora o policial declara, e
 * **o que ele declara é o que vale**, mesmo quando a relação discorda.
 *
 * DESENHO PARA QUEM ESTÁ NO FIM DO TURNO, NO CELULAR:
 *
 * - Comando e Batalhão já vêm preenchidos com os desta instalação (CPA/M-5 e
 *   16º BPM/M) e ficam à vista, não escondidos atrás de um "trocar" — quem é
 *   dos outros dois batalhões do CPA/M-5 precisa perceber que dá para mudar.
 * - A fração NÃO vem escolhida. É o único campo que muda de pessoa para pessoa,
 *   e default nenhum é melhor que default errado: o cartão fica em faixa de
 *   atenção até o toque.
 * - Quando o RE já identificou o policial, a fração que a relação aponta ganha
 *   um selo de sugestão — sugestão, não seleção. Confirmar é um toque, e o toque
 *   é dele.
 */

type Escolha = {
  comando: OpcaoUnidade | null;
  batalhao: OpcaoUnidade | null;
  fracao: OpcaoUnidade | null;
};

/** Ícone por fração, para a pessoa achar a dela pelo desenho antes de ler. */
function IconeFracao({ subunidade }: { subunidade: string | null }) {
  if (subunidade === "em") return <ClipboardList size={22} aria-hidden />;
  if (subunidade === "ft") return <Swords size={22} aria-hidden />;
  return <Users size={22} aria-hidden />;
}

/**
 * Sigla curta do cartão: "EM", "FT", "1ª"… — o que se lê de relance.
 *
 * As três últimas linhas existem para os batalhões que ainda não têm o de-para
 * com o vocabulário do painel: lá o nome vem do DEJEM ("1ª Cia PM ADM",
 * "Cia Força Tática ADM") e o corte cego devolvia "1.C", que não é sigla de
 * nada.
 */
function siglaDaFracao(o: OpcaoUnidade): string {
  if (o.subunidade === "em") return "EM";
  if (o.subunidade === "ft") return "FT";
  const n = o.nome.match(/(\d+)\s*ª/);
  if (n) return `${n[1]}ª`;
  if (/f\s*t[áa]t|for[çc]a\s+t[áa]tica/i.test(o.nome)) return "FT";
  if (/^em\b/i.test(o.nome)) return "EM";
  return o.nome.slice(0, 3).toUpperCase();
}

export function SeletorUnidade({
  arvore,
  escolha,
  onEscolha,
  sugestao,
}: {
  arvore: ArvoreFormulario;
  escolha: Escolha;
  onEscolha: (e: Escolha) => void;
  /** Subunidade que a relação do efetivo aponta para o RE digitado ('3cia'). */
  sugestao: string | null;
}) {
  /**
   * As listas viajam COM O CÓDIGO DO PAI que as gerou.
   *
   * Sem isso, o intervalo entre trocar de batalhão e a resposta chegar mostra as
   * frações do batalhão ANTERIOR já sob o novo cabeçalho — e um toque nesse
   * instante declara a fração de outro batalhão. Guardando o pai, a lista que
   * não corresponde à escolha simplesmente não é exibida.
   */
  const [batalhoes, setBatalhoes] = useState<{ pai: string; lista: OpcaoUnidade[] }>({
    pai: arvore.padrao.comando,
    lista: arvore.batalhoes,
  });
  const [fracoes, setFracoes] = useState<{ pai: string; lista: OpcaoUnidade[] }>({
    pai: arvore.padrao.batalhao,
    lista: arvore.fracoes,
  });
  const [carregando, setCarregando] = useState<"batalhao" | "fracao" | null>(null);
  const [falhou, setFalhou] = useState(false);

  const batalhoesVisiveis =
    batalhoes.pai === (escolha.comando?.cod ?? "") ? batalhoes.lista : [];
  const fracoesVisiveis =
    fracoes.pai === (escolha.batalhao?.cod ?? "") ? fracoes.lista : [];

  /* Uma busca por vez: trocar de comando duas vezes seguidas em 4G ruim faria a
     resposta lenta da primeira sobrescrever a lista da segunda. */
  const emVoo = useRef<AbortController | null>(null);

  async function filhosDe(pai: string, alvo: "batalhao" | "fracao") {
    emVoo.current?.abort();
    const controle = new AbortController();
    emVoo.current = controle;
    setCarregando(alvo);
    setFalhou(false);
    try {
      const r = await fetch(`/api/cop2026/unidades?pai=${encodeURIComponent(pai)}`, {
        signal: controle.signal,
      });
      if (!r.ok) throw new Error(String(r.status));
      const { opcoes } = (await r.json()) as { opcoes: OpcaoUnidade[] };
      if (alvo === "batalhao") setBatalhoes({ pai, lista: opcoes });
      else setFracoes({ pai, lista: opcoes });
      return opcoes;
    } catch (erro) {
      if ((erro as Error)?.name === "AbortError") return null;
      // Rede caiu no meio: o policial não fica sem saída — a mensagem manda
      // tentar de novo e o resto do formulário continua valendo.
      setFalhou(true);
      return null;
    } finally {
      if (emVoo.current === controle) setCarregando(null);
    }
  }

  useEffect(() => () => emVoo.current?.abort(), []);

  /**
   * As listas seguem a ESCOLHA, não o clique.
   *
   * Sincronizar por efeito, e não dentro do `onChange`, é o que faz a unidade
   * restaurada do aparelho funcionar: quem lançou ontem pelo 23º BPM/M reabre o
   * formulário com o 23º já escolhido, e as frações que aparecem têm de ser as
   * dele — não as do batalhão desta instalação, que vieram prontas da página.
   */
  const comandoCarregado = useRef<string | null>(arvore.padrao.comando || null);
  const batalhaoCarregado = useRef<string | null>(arvore.padrao.batalhao || null);

  useEffect(() => {
    const cod = escolha.comando?.cod;
    if (!cod || comandoCarregado.current === cod) return;
    comandoCarregado.current = cod;
    void (async () => {
      const opcoes = await filhosDe(cod, "batalhao");
      // Comando com um batalhão só: escolher por ele poupa um toque e não há o
      // que errar.
      if (opcoes?.length === 1) {
        onEscolha({ comando: escolha.comando, batalhao: opcoes[0], fracao: null });
      }
    })();
    /* Depende SÓ do código do comando: `escolha.comando` e `onEscolha` mudam de
       identidade a cada render do formulário, e incluí-los faria o efeito
       rebuscar a lista de batalhões a cada tecla digitada no RE. O `ref` acima
       já garante uma busca por comando. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolha.comando?.cod]);

  useEffect(() => {
    const cod = escolha.batalhao?.cod;
    if (!cod || batalhaoCarregado.current === cod) return;
    batalhaoCarregado.current = cod;
    void filhosDe(cod, "fracao");
  }, [escolha.batalhao?.cod]);

  function trocarComando(cod: string) {
    const comando = arvore.comandos.find((c) => c.cod === cod) ?? null;
    onEscolha({ comando, batalhao: null, fracao: null });
  }

  function trocarBatalhao(cod: string) {
    const batalhao = batalhoesVisiveis.find((b) => b.cod === cod) ?? null;
    onEscolha({ comando: escolha.comando, batalhao, fracao: null });
  }

  function escolherFracao(o: OpcaoUnidade) {
    onEscolha({ ...escolha, fracao: o });
  }

  const completo = Boolean(escolha.comando && escolha.batalhao && escolha.fracao);

  return (
    <fieldset
      className={`rounded-xl border-2 bg-tatico-super p-5 transition-colors ${
        completo ? "border-sinal-conforme/50" : "border-vermelho/50"
      }`}
    >
      <legend className="px-2 text-[11.5px] font-bold uppercase tracking-[0.14em] text-vermelho">
        1 · Sua unidade
      </legend>

      {/* Trilha do que está escolhido — sempre à vista, para o policial
          conferir de relance antes de enviar. */}
      <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-borda bg-tatico-fundo px-3 py-2.5 text-[13px] font-bold">
        <Landmark size={14} className="text-vermelho" aria-hidden />
        <span className="text-branco">{escolha.comando?.nome ?? "—"}</span>
        <ChevronRight size={13} className="text-texto-suave" aria-hidden />
        <Shield size={14} className="text-vermelho" aria-hidden />
        <span className="text-branco">{escolha.batalhao?.nome ?? "—"}</span>
        <ChevronRight size={13} className="text-texto-suave" aria-hidden />
        <Users size={14} className="text-vermelho" aria-hidden />
        {escolha.fracao ? (
          <span className="inline-flex items-center gap-1 text-sinal-conforme">
            <Check size={13} aria-hidden /> {escolha.fracao.nome}
          </span>
        ) : (
          <span className="text-sinal-atencao">escolha abaixo</span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-texto-suave">
            <Landmark size={13} aria-hidden /> Comando
          </span>
          <select
            value={escolha.comando?.cod ?? ""}
            onChange={(e) => trocarComando(e.target.value)}
            className={`${entradaSelect} mt-1`}
          >
            {arvore.comandos.map((c) => (
              <option key={c.cod} value={c.cod}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-texto-suave">
            <Shield size={13} aria-hidden /> Batalhão
            {carregando === "batalhao" && (
              <Loader2 size={12} className="animate-spin" aria-hidden />
            )}
          </span>
          <select
            value={escolha.batalhao?.cod ?? ""}
            onChange={(e) => trocarBatalhao(e.target.value)}
            disabled={batalhoesVisiveis.length === 0}
            className={`${entradaSelect} mt-1 disabled:opacity-50`}
          >
            <option value="">
              {batalhoesVisiveis.length === 0 ? "Escolha o comando primeiro" : "Selecione…"}
            </option>
            {batalhoesVisiveis.map((b) => (
              <option key={b.cod} value={b.cod}>
                {b.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* --------------------------------------------------------- fração */}

      <div
        className={`mt-5 rounded-lg border-2 p-4 transition-colors ${
          escolha.fracao
            ? "border-sinal-conforme/40 bg-sinal-conforme-suave/40"
            : "border-sinal-atencao/60 bg-sinal-atencao-suave/50"
        }`}
      >
        <p
          className={`flex items-center gap-2 text-[13.5px] font-bold uppercase tracking-wide ${
            escolha.fracao ? "text-sinal-conforme" : "text-sinal-atencao"
          }`}
        >
          {escolha.fracao ? (
            <>
              <Check size={16} aria-hidden /> Fração escolhida: {escolha.fracao.nome}
            </>
          ) : (
            <>
              <AlertTriangle size={16} aria-hidden /> Toque na sua fração — obrigatório
            </>
          )}
        </p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-texto-suave">
          Estado-Maior, Força Tática ou a sua Cia. Vale o que você marcar aqui:
          é nesta fração que o seu lançamento vai contar no painel do Comando.
        </p>

        {carregando === "fracao" && (
          <p className="mt-3 flex items-center gap-2 text-[13px] text-texto-suave">
            <Loader2 size={14} className="animate-spin" aria-hidden /> Carregando as frações…
          </p>
        )}

        {falhou && (
          <p className="mt-3 flex items-start gap-2 text-[13px] text-sinal-critico">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
            Não consegui carregar a lista agora. Toque de novo no comando ou no batalhão para
            tentar outra vez.
          </p>
        )}

        {fracoesVisiveis.length > 0 && (
          <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {fracoesVisiveis.map((o) => {
              const marcada = escolha.fracao?.cod === o.cod;
              const sugerida = Boolean(sugestao) && o.subunidade === sugestao;
              return (
                <li key={o.cod}>
                  <button
                    type="button"
                    onClick={() => escolherFracao(o)}
                    aria-pressed={marcada}
                    className={`flex min-h-24 w-full flex-col items-center justify-center gap-1 rounded-lg border-2 px-2 py-3 text-center transition-colors ${
                      marcada
                        ? "border-vermelho bg-vermelho/10 text-vermelho"
                        : "border-borda bg-tatico-super text-branco hover:border-vermelho/50"
                    }`}
                  >
                    <IconeFracao subunidade={o.subunidade} />
                    <span className="dados text-[17px] font-bold leading-none">
                      {siglaDaFracao(o)}
                    </span>
                    <span className="text-[11.5px] font-bold uppercase leading-tight tracking-wide">
                      {o.nome}
                    </span>
                    {sugerida && !marcada && (
                      <span className="rounded-full border border-sinal-atencao/50 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-sinal-atencao">
                        pela relação
                      </span>
                    )}
                    {marcada && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide">
                        <Check size={11} aria-hidden /> marcada
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* O servidor confere estes três contra a árvore de unidades; o painel
          conta pela fração declarada. */}
      <input type="hidden" name="comandoCod" value={escolha.comando?.cod ?? ""} />
      <input type="hidden" name="batalhaoCod" value={escolha.batalhao?.cod ?? ""} />
      <input type="hidden" name="fracaoCod" value={escolha.fracao?.cod ?? ""} />
      <input type="hidden" name="subunidadeDeclarada" value={escolha.fracao?.subunidade ?? ""} />
    </fieldset>
  );
}

const entradaSelect =
  "w-full min-h-12 rounded-md border border-borda bg-branco/[0.02] px-3 py-3 text-[15px] font-bold text-branco outline-none focus:border-vermelho/50";
