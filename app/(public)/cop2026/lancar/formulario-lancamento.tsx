"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CircleHelp,
  Info,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import {
  TETO_HARD_EVIDENCIAS,
  OPCOES_TURNO,
  lerEvidencias,
  normalizarRe,
  prefixoExibicao,
} from "@/lib/cop2026-lancamento";
import { hojeBrt } from "@/lib/cop2026-ciclo";
import { enviarLancamentoAction } from "./actions";
import { ESTADO_INICIAL, type LancamentoState } from "./estado";

/**
 * Formulário de lançamento da Auditoria de COP — substitui o Google Forms.
 *
 * O QUE ESTE DESENHO RESOLVE, medido nos 103 lançamentos de agosto/2026:
 *
 * - **Teto de 6 identificadores.** 15 lançamentos declararam mais de 6 (um
 *   deles 32) e só puderam registrar 6: quem auditou 18 provou 6. Aqui é botão
 *   "+", sem teto de interface.
 * - **Piso de 3.** Os três primeiros campos do Forms eram obrigatórios, então
 *   103 de 103 lançamentos têm pelo menos 3 identificadores — o mínimo do
 *   Batalhão. A conformidade calculada em cima disso era tautologia. Aqui não
 *   há piso: um vídeo é um campo.
 * - **43,1% do que foi colado não era identificador de nada.** A recusa aqui é
 *   ao digitar e NOMEIA o que a pessoa colou ("isso é um CPF", "isso é um RE").
 *   Dizer só "inválido" faz desistir ou insistir.
 * - **Colar 5 identificadores custava ~60 interações e 10 trocas de app.** Aqui
 *   a colagem múltipla se divide sozinha, porque trocar de aplicativo no
 *   celular é exatamente o que mata a aba do navegador — e com ela o rascunho.
 */

type Campo = { id: string; valor: string };

const CHAVE_RASCUNHO = "cop2026:lancar";

function novoCampo(valor = ""): Campo {
  return { id: crypto.randomUUID(), valor };
}

function novaSubmissao(): string {
  return crypto.randomUUID();
}

/* ------------------------------------------------------------- rascunho */

type Rascunho = {
  re: string;
  nomeGuerra: string;
  posto: string;
  funcao: string;
  auditou: boolean | null;
  quantidade: string;
  campos: string[];
  numeroParte: string;
  justificativa: string;
};

/**
 * O rascunho não é conveniência: este formulário EXIGE sair do aplicativo para
 * copiar o identificador na plataforma Motorola, e voltar em aba descartada
 * pelo sistema é o caminho normal no celular — não a exceção. Chave por
 * data+turno para que o segundo lançamento do dia não sobrescreva o primeiro.
 */
function chaveRascunho(data: string, turno: string): string {
  return `${CHAVE_RASCUNHO}:${data}|${turno}`;
}

function lerRascunho(chave: string): Rascunho | null {
  try {
    const cru = window.localStorage.getItem(chave);
    return cru ? (JSON.parse(cru) as Rascunho) : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------ componente */

export function FormularioLancamento({ identificado }: { identificado: string | null }) {
  /**
   * Identificador de envio em `ref`, e não em estado.
   *
   * Ele existe porque em 4G ruim o POST estoura DEPOIS de o servidor aceitar, o
   * aplicativo reenvia e nasce a duplicata. Não pode ser gerado na inicialização
   * de um `useState`: `crypto.randomUUID()` correria no servidor durante o SSR e
   * de novo na hidratação, com valores diferentes. E não precisa ser estado —
   * nada na tela depende dele; ele só viaja no envio.
   */
  const submissao = useRef<string | null>(null);

  /** Lê (criando na primeira vez) o identificador da submissão. Chamado só de
   *  dentro da ação — nunca durante o render, que é onde ref não se toca. */
  function idDaSubmissao(): string {
    if (submissao.current == null) submissao.current = novaSubmissao();
    return submissao.current;
  }

  const [estado, acao, enviando] = useActionState<LancamentoState, FormData>(
    async (anterior, formData) => {
      formData.set("idSubmissao", idDaSubmissao());
      const resultado = await enviarLancamentoAction(anterior, formData);
      if (resultado.ok) {
        // Rascunho cumpriu o papel; e a próxima submissão precisa de
        // identificador novo, senão colidiria com esta pela idempotência.
        try {
          const turnoEnviado = String(formData.get("turno") ?? "");
          const dataEnviada = String(formData.get("dataAuditoria") ?? "");
          if (turnoEnviado) {
            window.localStorage.removeItem(chaveRascunho(dataEnviada, turnoEnviado));
          }
        } catch {
          // Aba anônima: nada a limpar.
        }
        submissao.current = novaSubmissao();
      }
      return resultado;
    },
    ESTADO_INICIAL
  );

  const hoje = useMemo(() => hojeBrt(), []);
  const [data, setData] = useState(hoje);
  const [turno, setTurno] = useState<string>("");
  const [re, setRe] = useState("");
  const [nomeGuerra, setNomeGuerra] = useState("");
  const [posto, setPosto] = useState("");
  const [funcao, setFuncao] = useState("");
  const [auditou, setAuditou] = useState<boolean | null>(null);
  const [quantidade, setQuantidade] = useState("");
  const [campos, setCampos] = useState<Campo[]>([novoCampo()]);
  const [numeroParte, setNumeroParte] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [avisoColagem, setAvisoColagem] = useState<string | null>(null);
  const [rascunhoRestaurado, setRascunhoRestaurado] = useState(false);

  /* ------------------------------------------------- restaurar rascunho */

  /**
   * A restauração acontece no EVENTO que troca data ou turno, não num efeito.
   *
   * O par data+turno é a chave do rascunho e só muda por toque do usuário —
   * então este é o momento exato em que há o que restaurar. Fazer isso em
   * efeito significaria renderizar a tela vazia primeiro e sobrescrevê-la
   * depois, com uma cascata de nove `setState` a cada render do par.
   */
  function restaurar(novaData: string, novoTurno: string) {
    if (!novoTurno) return;
    const guardado = lerRascunho(chaveRascunho(novaData, novoTurno));
    if (!guardado) return;
    setRe(guardado.re ?? "");
    setNomeGuerra(guardado.nomeGuerra ?? "");
    setPosto(guardado.posto ?? "");
    setFuncao(guardado.funcao ?? "");
    setAuditou(guardado.auditou ?? null);
    setQuantidade(guardado.quantidade ?? "");
    setCampos(
      (guardado.campos ?? []).length ? guardado.campos.map((v) => novoCampo(v)) : [novoCampo()]
    );
    setNumeroParte(guardado.numeroParte ?? "");
    setJustificativa(guardado.justificativa ?? "");
    setRascunhoRestaurado(true);
  }

  function escolherTurno(t: string) {
    setTurno(t);
    restaurar(data, t);
  }

  function escolherData(d: string) {
    setData(d);
    restaurar(d, turno);
  }

  /* ---------------------------------------------------- gravar rascunho */

  const gravando = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!turno || estado.ok) return;
    if (gravando.current) clearTimeout(gravando.current);
    // Debounce: gravar a cada tecla trava a digitação em aparelho antigo, e o
    // efetivo do Batalhão não usa celular novo.
    gravando.current = setTimeout(() => {
      try {
        const rascunho: Rascunho = {
          re,
          nomeGuerra,
          posto,
          funcao,
          auditou,
          quantidade,
          campos: campos.map((c) => c.valor),
          numeroParte,
          justificativa,
        };
        window.localStorage.setItem(chaveRascunho(data, turno), JSON.stringify(rascunho));
      } catch {
        // Aba anônima ou armazenamento cheio: o formulário continua valendo.
      }
    }, 400);
    return () => {
      if (gravando.current) clearTimeout(gravando.current);
    };
  }, [
    data,
    turno,
    re,
    nomeGuerra,
    posto,
    funcao,
    auditou,
    quantidade,
    campos,
    numeroParte,
    justificativa,
    estado.ok,
  ]);

  /* --------------------------------------------- leitura dos campos de ID */

  const leitura = useMemo(
    () => lerEvidencias(campos.map((c) => c.valor)),
    [campos]
  );
  const porCampo = useMemo(
    () => campos.map((c) => lerEvidencias([c.valor])),
    [campos]
  );

  const reNormalizado = useMemo(() => normalizarRe(re), [re]);

  /**
   * Colagem múltipla: se um campo resolve para mais de um identificador, ele
   * se divide sozinho e a tela DIZ que dividiu. Divisão calada assusta mais que
   * recusa — a pessoa acha que perdeu o que colou.
   */
  function atualizarCampo(indice: number, valor: string) {
    const achados = lerEvidencias([valor]).evidencias;
    if (achados.length > 1) {
      setCampos((atuais) => {
        const novos = [...atuais];
        novos.splice(indice, 1, ...achados.map((e) => novoCampo(e.bruto)));
        return novos.slice(0, TETO_HARD_EVIDENCIAS);
      });
      setAvisoColagem(
        `Encontramos ${achados.length} identificadores nessa colagem e separamos um por campo.`
      );
      return;
    }
    setCampos((atuais) => atuais.map((c, i) => (i === indice ? { ...c, valor } : c)));
  }

  const podeEnviar =
    Boolean(turno) &&
    auditou !== null &&
    !enviando &&
    (auditou ? leitura.evidencias.length > 0 : justificativa.trim().length >= 5);

  /* ------------------------------------------------------------ sucesso */

  if (estado.ok) {
    return (
      <div className="rounded-xl border border-sinal-conforme/40 bg-sinal-conforme-suave p-6 text-center">
        <Check size={34} className="mx-auto text-sinal-conforme" aria-hidden />
        <h2 className="mt-3 font-serif text-xl font-bold uppercase tracking-wide text-branco">
          {estado.duplicado ? "Lançamento já registrado" : "Lançamento registrado"}
        </h2>
        <p className="mt-2 text-[14px] text-texto-suave">
          Protocolo <span className="dados-destaque text-[17px]">{estado.protocolo}</span>
        </p>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-texto-suave">
          {estado.duplicado
            ? "Este envio já havia chegado — o registro é o mesmo, não foi duplicado."
            : "Guarde o protocolo. Ele identifica este lançamento na conferência do Comando."}
        </p>

        {estado.avisos.length > 0 && (
          <ul className="mx-auto mt-4 max-w-md space-y-2 text-left">
            {estado.avisos.map((aviso) => (
              <li
                key={aviso}
                className="flex items-start gap-2 rounded-lg border border-borda px-3 py-2 text-[12.5px] text-texto-suave"
              >
                <Info size={14} className="mt-0.5 shrink-0" aria-hidden /> {aviso}
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 min-h-12 rounded-md border border-borda px-5 py-3 text-[13px] font-bold uppercase tracking-wide text-branco hover:border-vermelho/40"
        >
          Fazer outro lançamento
        </button>
      </div>
    );
  }

  /* ----------------------------------------------------------- formulário */

  return (
    <form action={acao} className="space-y-5">
      <input type="hidden" name="auditou" value={auditou === null ? "" : auditou ? "sim" : "nao"} />

      {estado.erros.length > 0 && (
        <div
          role="alert"
          className="rounded-lg border border-sinal-critico/40 bg-sinal-critico-suave px-4 py-3"
        >
          <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-sinal-critico">
            <AlertTriangle size={15} aria-hidden /> Corrija antes de enviar
          </p>
          <ul className="mt-2 space-y-1.5 text-[13.5px] leading-relaxed text-sinal-critico">
            {estado.erros.map((erro) => (
              <li key={erro}>· {erro}</li>
            ))}
          </ul>
        </div>
      )}

      {rascunhoRestaurado && (
        <p className="flex items-start gap-2 rounded-lg border border-borda px-4 py-2.5 text-[12.5px] text-texto-suave">
          <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
          Recuperamos o que você já tinha preenchido para esta data e turno neste aparelho.
        </p>
      )}

      {/* ---------------------------------------------------- identificação */}

      <fieldset className="rounded-xl border border-borda bg-tatico-super p-5">
        <legend className="px-2 text-[11.5px] font-bold uppercase tracking-[0.14em] text-texto-suave">
          1 · Quem lança
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Data da auditoria">
            <input
              type="date"
              name="dataAuditoria"
              value={data}
              max={hoje}
              onChange={(e) => escolherData(e.target.value)}
              required
              className={entrada}
            />
          </Campo>

          <Campo rotulo="RE">
            <input
              name="re"
              value={re}
              onChange={(e) => setRe(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              placeholder="123456-7"
              required
              className={entrada}
            />
            {re.length > 0 && reNormalizado.base.length === 6 && (
              <p className="mt-1.5 text-[12px] text-texto-suave">
                Registrado como <span className="dados">{reNormalizado.canonico}</span>
              </p>
            )}
          </Campo>
        </div>

        <div className="mt-4">
          <p className="text-[12.5px] font-bold uppercase tracking-wide text-texto-suave">
            Turno de serviço
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {/* O botão mostra o rótulo curto e envia o valor do banco
                (Diurno/Noturno) — ver OPCOES_TURNO em lib/cop2026-lancamento. */}
            {OPCOES_TURNO.map((o) => (
              <button
                key={o.valor}
                type="button"
                onClick={() => escolherTurno(o.valor)}
                aria-pressed={turno === o.valor}
                className={`min-h-12 rounded-md border px-3 py-3 text-[13px] font-bold transition-colors ${
                  turno === o.valor
                    ? "border-vermelho bg-vermelho/10 text-vermelho"
                    : "border-borda text-branco hover:border-vermelho/40"
                }`}
              >
                {o.rotulo}
              </button>
            ))}
          </div>
          <input type="hidden" name="turno" value={turno} />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Campo rotulo="Nome de guerra">
            <input
              name="nomeGuerra"
              value={nomeGuerra}
              onChange={(e) => setNomeGuerra(e.target.value)}
              autoComplete="off"
              required
              className={entrada}
            />
          </Campo>
          <Campo rotulo="Posto / graduação">
            <input
              name="posto"
              value={posto}
              onChange={(e) => setPosto(e.target.value)}
              autoComplete="off"
              className={entrada}
            />
          </Campo>
          <Campo rotulo="Função">
            <input
              name="funcao"
              value={funcao}
              onChange={(e) => setFuncao(e.target.value)}
              autoComplete="off"
              className={entrada}
            />
          </Campo>
        </div>

        {identificado && (
          <p className="mt-4 text-[12px] text-texto-suave">
            Sessão de <span className="dados">{identificado}</span> — o lançamento fica vinculado a
            esta conta.
          </p>
        )}
      </fieldset>

      {/* ------------------------------------------------------ auditou? */}

      <fieldset className="rounded-xl border border-borda bg-tatico-super p-5">
        <legend className="px-2 text-[11.5px] font-bold uppercase tracking-[0.14em] text-texto-suave">
          2 · Auditou vídeo neste turno?
        </legend>

        {/* "Não auditei" fica NO TOPO e leva a 3 toques até enviar. No Forms,
            quem não auditou rolava a tela inteira de identificadores antes de
            chegar à justificativa. */}
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setAuditou(true)}
            aria-pressed={auditou === true}
            className={`min-h-14 rounded-md border px-4 py-4 text-[14px] font-bold uppercase tracking-wide transition-colors ${
              auditou === true
                ? "border-vermelho bg-vermelho/10 text-vermelho"
                : "border-borda text-branco hover:border-vermelho/40"
            }`}
          >
            Sim, auditei
          </button>
          <button
            type="button"
            onClick={() => setAuditou(false)}
            aria-pressed={auditou === false}
            className={`min-h-14 rounded-md border px-4 py-4 text-[14px] font-bold uppercase tracking-wide transition-colors ${
              auditou === false
                ? "border-vermelho bg-vermelho/10 text-vermelho"
                : "border-borda text-branco hover:border-vermelho/40"
            }`}
          >
            Não auditei
          </button>
        </div>
      </fieldset>

      {/* ------------------------------------------------- não auditou */}

      {auditou === false && (
        <fieldset className="rounded-xl border border-borda bg-tatico-super p-5">
          <legend className="px-2 text-[11.5px] font-bold uppercase tracking-[0.14em] text-texto-suave">
            3 · Justificativa
          </legend>
          <Campo rotulo="Por que não foi possível auditar neste turno">
            <textarea
              name="justificativa"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              rows={4}
              required
              className={`${entrada} resize-y`}
            />
          </Campo>
          <Campo rotulo="Número da parte (se já houver)">
            <input
              name="numeroParte"
              value={numeroParte}
              onChange={(e) => setNumeroParte(e.target.value)}
              autoComplete="off"
              className={entrada}
            />
            {/* Deliberadamente OPCIONAL: se a parte ainda não foi redigida,
                exigir o número faz a pessoa inventar um. */}
            <p className="mt-1.5 text-[12px] text-texto-suave">
              Opcional — deixe em branco se a parte ainda não foi redigida.
            </p>
          </Campo>
        </fieldset>
      )}

      {/* ---------------------------------------------------- auditou */}

      {auditou === true && (
        <fieldset className="rounded-xl border border-borda bg-tatico-super p-5">
          <legend className="px-2 text-[11.5px] font-bold uppercase tracking-[0.14em] text-texto-suave">
            3 · Identificadores das gravações auditadas
          </legend>

          <details className="mb-4 rounded-lg border border-borda px-4 py-3">
            <summary className="cursor-pointer text-[13px] font-bold text-branco">
              <CircleHelp size={14} className="mr-1.5 inline" aria-hidden />
              Onde copiar o identificador na plataforma
            </summary>
            <div className="mt-3 space-y-2 text-[13px] leading-relaxed text-texto-suave">
              <p>
                Na tela <strong className="text-branco">Visão geral</strong> da gravação, copie o{" "}
                <strong className="text-branco">ID da mídia</strong> (32 caracteres) ou o{" "}
                <strong className="text-branco">ID da gravação</strong> (com hífens). Pode colar
                vários de uma vez — separamos sozinhos. Colar o endereço da página também funciona.
              </p>
              <p className="rounded border border-sinal-atencao/40 bg-sinal-atencao-suave px-3 py-2 text-sinal-atencao">
                Não copie o campo <strong>Operador</strong>: ele traz o CPF do policial dono da
                câmera, e esse dado não pode ser registrado aqui.
              </p>
            </div>
          </details>

          <Campo rotulo="Quantidade auditada no turno">
            <input
              name="quantidadeDeclarada"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
              inputMode="numeric"
              placeholder={String(leitura.evidencias.length || "")}
              className={`${entrada} max-w-32`}
            />
            <p className="mt-1.5 text-[12px] text-texto-suave">
              Em branco, vale a quantidade de identificadores informados abaixo.
            </p>
          </Campo>

          {avisoColagem && (
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-borda px-3 py-2 text-[12.5px] text-texto-suave">
              <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
              {avisoColagem}
              <button
                type="button"
                onClick={() => setAvisoColagem(null)}
                className="ml-auto shrink-0 text-texto-suave hover:text-vermelho"
                aria-label="Fechar aviso"
              >
                <X size={14} aria-hidden />
              </button>
            </p>
          )}

          <ul className="mt-4 space-y-3">
            {campos.map((campo, i) => {
              const desteCampo = porCampo[i];
              const evidencia = desteCampo?.evidencias[0];
              const recusa = desteCampo?.recusas[0];
              return (
                <li key={campo.id}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <label className="text-[12px] font-bold uppercase tracking-wide text-texto-suave">
                        Vídeo {i + 1}
                        {/* Prefixo só para a pessoa saber qual campo é qual.
                            NUNCA para comparar ou deduplicar: 8 hex são 32 bits
                            e a colisão viraria acusação falsa de duplicidade. */}
                        {evidencia && (
                          <span className="ml-2 dados text-vermelho">
                            {prefixoExibicao(
                              evidencia.idMidia ?? evidencia.idGravacao ?? campo.valor
                            )}
                          </span>
                        )}
                      </label>
                      <input
                        name="identificador"
                        value={campo.valor}
                        onChange={(e) => atualizarCampo(i, e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="Cole aqui o ID da mídia ou da gravação"
                        className={`${entrada} mt-1 font-mono text-[13px]`}
                        aria-invalid={Boolean(recusa)}
                      />
                    </div>
                    {campos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setCampos((c) => c.filter((_, j) => j !== i))}
                        className="mt-6 min-h-12 min-w-12 rounded-md border border-borda text-texto-suave hover:border-vermelho/40 hover:text-vermelho"
                        aria-label={`Remover vídeo ${i + 1}`}
                      >
                        <Trash2 size={15} className="mx-auto" aria-hidden />
                      </button>
                    )}
                  </div>

                  {recusa && (
                    <p className="mt-1.5 flex items-start gap-1.5 text-[12.5px] leading-relaxed text-sinal-critico">
                      <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden />
                      {recusa.explicacao}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={() => setCampos((c) => [...c, novoCampo()])}
            disabled={campos.length >= TETO_HARD_EVIDENCIAS}
            className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-md border border-borda px-4 py-3 text-[13px] font-bold uppercase tracking-wide text-branco transition-colors hover:border-vermelho/40 disabled:opacity-40"
          >
            <Plus size={15} aria-hidden /> Outro vídeo
          </button>

          <p className="mt-4 border-t border-borda pt-4 text-[12.5px] leading-relaxed text-texto-suave">
            {leitura.evidencias.length} identificador
            {leitura.evidencias.length === 1 ? "" : "es"} reconhecido
            {leitura.evidencias.length === 1 ? "" : "s"}.{" "}
            {/* Aviso honesto, e não decorativo: o eco do prefixo acima PARECE
                validação contra a plataforma, e não é. */}
            O Portal registra o que você informou e a hora em que informou; ele{" "}
            <strong className="text-branco">não confere</strong> o identificador na plataforma
            Motorola.
          </p>
        </fieldset>
      )}

      {/* ------------------------------------------------------- enviar */}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!podeEnviar}
          className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-md border border-vermelho bg-vermelho/10 px-6 py-4 text-[14px] font-bold uppercase tracking-wide text-vermelho transition-colors hover:bg-vermelho/15 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
        >
          {enviando ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden /> Enviando…
            </>
          ) : (
            "Enviar lançamento"
          )}
        </button>
        <p className="text-[12px] text-texto-suave">
          O rascunho fica guardado neste aparelho até o envio.
        </p>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------- auxiliares */

const entrada =
  "w-full min-h-12 rounded-md border border-borda bg-branco/[0.02] px-3 py-3 text-[15px] text-branco outline-none placeholder:text-texto-suave/60 focus:border-vermelho/50";

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[12px] font-bold uppercase tracking-wide text-texto-suave">
        {rotulo}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
