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
import { MINIMO_PADRAO } from "@/lib/cop2026-metricas";
import { MOTIVOS_ABAIXO_DO_MINIMO } from "@/lib/cop2026";
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
  /** Motivo pré-ajustado escolhido; "" quando o auditor escreveu texto livre
   *  em vez de escolher uma das opções fechadas. */
  motivo: string;
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
  /**
   * Motivo pré-ajustado — obrigatório quando o auditor NÃO auditou ou auditou
   * ABAIXO do mínimo do Batalhão (`MINIMO_PADRAO`, hoje 3). Determinação do
   * Comando em 02/09/2026: em vez de campo livre, escolha entre um conjunto
   * fechado, com detalhe opcional no `justificativa`. Sem isso, o mesmo motivo
   * saía de dez pessoas com dez redações diferentes.
   */
  const [motivo, setMotivo] = useState("");
  const [avisoColagem, setAvisoColagem] = useState<string | null>(null);
  const [rascunhoRestaurado, setRascunhoRestaurado] = useState(false);
  /**
   * Tela intermediária de conferência.
   *
   * Antes daqui, o botão "Enviar lançamento" mandava direto: a tela do
   * formulário sumia e reaparecia a tela de sucesso, sem eco do que foi
   * gravado. O auditor não sabia se acertou a fração ou trocou um dígito do
   * identificador antes de o Comando cobrar. Agora: um passo de revisão que
   * mostra tudo, e só o botão dentro dele envia de verdade (`type="submit"`).
   */
  const [revisando, setRevisando] = useState(false);

  /* Se o servidor recusou o envio, sai da revisão para o auditor VER os erros
     acima do formulário e corrigir. Sem isto o cartão de revisão continuaria
     na frente e o `<div role="alert">` ficaria escondido no topo. */
  const alertaErroRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (estado.erros.length === 0) return;
    setRevisando(false);
    /* E LEVA A PESSOA ATÉ O ALERTA (08/09/2026). Sair da revisão não bastava:
       o policial toca em "Confirmar e enviar" no fim da página, a revisão some,
       o alerta aparece LÁ EM CIMA e a tela não se move. No celular, no fim do
       turno, o que ele vê é o formulário do jeito que estava — e vai embora
       achando que enviou. `focus` além do scroll: leitor de tela precisa do
       foco para anunciar o alerta. */
    const alvo = alertaErroRef.current;
    if (!alvo) return;
    alvo.scrollIntoView({ behavior: "smooth", block: "center" });
    alvo.focus({ preventScroll: true });
  }, [estado.erros]);
  /** Ficha do roster para o RE digitado — só para confirmar na tela quem é. */
  const [fichaRoster, setFichaRoster] = useState<{
    nome: string;
    posto: string;
    cia: string;
  } | null>(null);

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
    setMotivo(guardado.motivo ?? "");
    // O que veio do rascunho é do usuário, não do roster: zerar o marcador
    // impede que a busca por RE reescreva por cima do que ele já tinha.
    escritoPeloRoster.current = null;
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
          motivo,
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
    motivo,
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

  /* ------------------------------------------ RE → nome, posto e subunidade */

  /**
   * Digitou o RE, a tela preenche nome/posto/função a partir do roster do
   * Batalhão (`p4_efetivo`, via /api/cop2026/efetivo).
   *
   * Por que isto existe: o mesmo PM chegava ao painel como "RAFAEL", "Rafael S."
   * e "CB RAFAEL", e a contagem por pessoa não fechava. Agora o nome que sai é
   * sempre o da relação.
   *
   * TRÊS CUIDADOS QUE NÃO SÃO OPCIONAIS
   *
   * 1. **Não sobrescreve o que a pessoa escreveu.** Só preenche campo vazio ou
   *    campo cujo conteúdo é EXATAMENTE o que uma busca anterior escreveu
   *    (`escritoPeloRoster`) — trocar o RE troca o nome, mas quem corrigiu o
   *    próprio nome à mão não vê a correção sumir na tecla seguinte. Um flag
   *    booleano não bastaria: ele reescreveria por cima da correção.
   * 2. **Rascunho restaurado não dispara nada** — `restaurar()` já devolveu os
   *    valores gravados, e eles valem mais que o roster.
   * 3. **Corrida de resposta**: quem digita rápido gera duas buscas, e a lenta
   *    pode chegar depois da certa. `AbortController` + guarda pelo RE pedido
   *    impedem que o nome do RE anterior caia no formulário.
   *
   * Roster fora do ar, RE de fora do efetivo ou base duplicada: a resposta é a
   * mesma (`ficha: null`) e a tela volta a ser digitação livre — nunca recusa o
   * lançamento, pela mesma razão do "roster enriquece, nunca bloqueia".
   */
  const escritoPeloRoster = useRef<{ nome: string; posto: string; funcao: string } | null>(null);
  const baseRe = reNormalizado.base;

  useEffect(() => {
    if (baseRe.length < 6) {
      // Apagou o RE: a ficha some junto, senão a tela continua afirmando um
      // nome que já não corresponde ao campo.
      setFichaRoster(null);
      return;
    }
    const controle = new AbortController();
    // 350 ms: o roster só é consultado quando a digitação para, não a cada
    // dígito do verificador.
    const agendado = setTimeout(async () => {
      try {
        const resposta = await fetch(
          `/api/cop2026/efetivo?re=${encodeURIComponent(baseRe)}`,
          { signal: controle.signal }
        );
        if (!resposta.ok) return;
        const { ficha } = (await resposta.json()) as {
          ficha: { nome: string; posto: string; cia: string } | null;
        };
        if (!ficha) return;

        const anterior = escritoPeloRoster.current;
        const substituir = (atual: string, anteriorDoRoster: string, novo: string) =>
          atual.trim().length === 0 || atual === anteriorDoRoster ? novo : atual;

        setNomeGuerra((atual) => substituir(atual, anterior?.nome ?? " ", ficha.nome));
        setPosto((atual) => substituir(atual, anterior?.posto ?? " ", ficha.posto));
        setFuncao((atual) => substituir(atual, anterior?.funcao ?? " ", ficha.cia));
        // O sentinela ` ` na primeira busca evita que `anterior` ausente
        // vire string vazia e case com qualquer campo já digitado.
        escritoPeloRoster.current = { nome: ficha.nome, posto: ficha.posto, funcao: ficha.cia };
        setFichaRoster(ficha);
      } catch {
        // Abortado ou rede caída: segue digitação livre.
      }
    }, 350);
    return () => {
      clearTimeout(agendado);
      controle.abort();
    };
  }, [baseRe]);

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

  /* Quantidade que vai valer: o campo explícito, ou o nº de identificadores. */
  const quantidadeEfetiva =
    quantidade.trim() ? Number(quantidade) : leitura.evidencias.length;
  /* Determinação do Comando (02/09/2026): abaixo do mínimo do Batalhão, o
     motivo é OBRIGATÓRIO e vem de uma lista fechada — mesma lista de quem não
     auditou, para que os dois casos consolidem juntos no relatório. Detalhe
     livre continua permitido em `justificativa`, agora opcional. */
  const abaixoDoMinimo = auditou === true && quantidadeEfetiva < MINIMO_PADRAO;
  const precisaDeMotivo = auditou === false || abaixoDoMinimo;
  const motivoValido = precisaDeMotivo
    ? MOTIVOS_ABAIXO_DO_MINIMO.includes(motivo as (typeof MOTIVOS_ABAIXO_DO_MINIMO)[number])
    : true;

  const podeEnviar =
    Boolean(turno) &&
    auditou !== null &&
    !enviando &&
    (auditou
      ? leitura.evidencias.length > 0 && motivoValido
      : motivoValido && justificativa.trim().length >= 0);

  /* ------------------------------------------------------------ sucesso */

  if (estado.ok) {
    return (
      <ComprovanteProtocolo
        protocolo={estado.protocolo ?? ""}
        duplicado={estado.duplicado}
        avisos={estado.avisos}
        data={data}
        turno={turno}
        /* RE CANÔNICO, não o digitado: o servidor grava
           `normalizarRe(re).canonico` (`972607-1`), e o comprovante é o print
           que o auditor guarda como prova. Exibir "972607 1" ou "9726071" aqui
           faz o papel discordar do registro que o Comando confere depois. */
        re={reNormalizado.canonico || re}
        nomeGuerra={nomeGuerra}
        posto={posto}
        fracao={fichaRoster?.cia}
        auditou={auditou}
        quantidadeEfetiva={quantidadeEfetiva}
        identificadores={leitura.evidencias.map((e) => e.bruto)}
        motivo={precisaDeMotivo ? motivo : ""}
        justificativa={justificativa}
        numeroParte={numeroParte}
      />
    );
  }

  /* ----------------------------------------------------------- formulário */

  return (
    <form action={acao} className="space-y-5">
      <input type="hidden" name="auditou" value={auditou === null ? "" : auditou ? "sim" : "nao"} />

      {estado.erros.length > 0 && (
        <div
          ref={alertaErroRef}
          role="alert"
          tabIndex={-1}
          className="rounded-lg border border-sinal-critico/40 bg-sinal-critico-suave px-4 py-3 outline-none"
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
            {/* Confirmação de quem é — o auditor vê o nome da relação e percebe
                na hora se digitou o RE errado, que era o erro mais caro do
                Google Forms: lançamento correto atribuído a outra pessoa. */}
            {fichaRoster && (
              <p className="mt-1 text-[12px] text-texto-suave">
                <span className="dados text-branco">
                  {fichaRoster.posto} {fichaRoster.nome}
                </span>
                {fichaRoster.cia ? ` · ${fichaRoster.cia}` : ""}
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
          <CaixaMotivo
            titulo="Motivo pelo qual não foi possível auditar neste turno"
            motivo={motivo}
            setMotivo={setMotivo}
            justificativa={justificativa}
            setJustificativa={setJustificativa}
            entrada={entrada}
          />
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

          {abaixoDoMinimo && (
            /* Só aparece quando a QUANTIDADE já foi definida e ficou abaixo do
               piso — não polui a tela de quem ainda vai colar mais IDs. */
            <div className="mt-4 rounded-lg border border-sinal-atencao/40 bg-sinal-atencao-suave/40 p-4">
              <p className="mb-3 text-[13px] font-bold text-sinal-atencao">
                Auditou abaixo do mínimo de {MINIMO_PADRAO} — justifique.
              </p>
              <CaixaMotivo
                titulo="Motivo do lançamento abaixo do mínimo do Batalhão"
                motivo={motivo}
                setMotivo={setMotivo}
                justificativa={justificativa}
                setJustificativa={setJustificativa}
                entrada={entrada}
              />
            </div>
          )}

          {avisoColagem && (
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-borda px-3 py-2 text-[12.5px] text-texto-suave">
              <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
              {avisoColagem}
              {/* Alvo de 44px (WCAG 2.5.5): antes era só o ícone de 14px, e no
                  celular errar o toque ao lado de texto corrido era fácil. */}
              <button
                type="button"
                onClick={() => setAvisoColagem(null)}
                className="-my-2 ml-auto flex min-h-11 min-w-11 shrink-0 items-center justify-center text-texto-suave hover:text-vermelho"
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
                      {/* `htmlFor`/`id` e `aria-describedby` (08/09/2026): sem eles,
                          tocar em "Vídeo N" no celular não focava o campo — o único
                          do formulário assim — e o leitor de tela anunciava
                          "inválido" sem nunca ler o porquê. */}
                      <label
                        htmlFor={`identificador-${i}`}
                        className="text-[12px] font-bold uppercase tracking-wide text-texto-suave"
                      >
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
                        id={`identificador-${i}`}
                        name="identificador"
                        value={campo.valor}
                        onChange={(e) => atualizarCampo(i, e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="Cole aqui o ID da mídia ou da gravação"
                        className={`${entrada} mt-1 font-mono text-[13px]${
                          recusa ? " border-sinal-critico/60" : ""
                        }`}
                        aria-invalid={Boolean(recusa)}
                        aria-describedby={recusa ? `identificador-${i}-erro` : undefined}
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
                    <p
                      id={`identificador-${i}-erro`}
                      className="mt-1.5 flex items-start gap-1.5 text-[12.5px] leading-relaxed text-sinal-critico"
                    >
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

      {revisando ? (
        <CartaoRevisao
          data={data}
          turno={turno}
          /* Mesma razão do comprovante: a revisão mostra o que VAI ser gravado,
             e o que vai ser gravado é o canônico. */
          re={reNormalizado.canonico || re}
          nomeGuerra={nomeGuerra}
          posto={posto}
          funcao={funcao}
          fracao={fichaRoster?.cia}
          auditou={auditou}
          quantidadeEfetiva={quantidadeEfetiva}
          identificadores={leitura.evidencias.map((e) => e.bruto)}
          motivo={precisaDeMotivo ? motivo : ""}
          justificativa={justificativa}
          numeroParte={numeroParte}
          enviando={enviando}
          onCorrigir={() => setRevisando(false)}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!podeEnviar}
            onClick={() => setRevisando(true)}
            className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-md border border-vermelho bg-vermelho/10 px-6 py-4 text-[14px] font-bold uppercase tracking-wide text-vermelho transition-colors hover:bg-vermelho/15 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
          >
            Revisar antes de enviar
          </button>
          <p className="text-[12px] text-texto-suave">
            Você verá tudo o que vai gravar antes de confirmar. O rascunho fica
            guardado neste aparelho até o envio.
          </p>
        </div>
      )}
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

/**
 * Formata data ISO como dd/mm/aaaa — usado nas duas telas de eco (revisão e
 * comprovante). Só duas superfícies precisam disso e não vale importar `Intl`
 * inteiro; é conversão de posição.
 */
function dataBr(iso: string): string {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function LinhaEco({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-borda py-1.5 last:border-0">
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-texto-suave">
        {rotulo}
      </span>
      <span className="min-w-0 flex-1 break-words text-right text-[14px] text-branco">{valor}</span>
    </div>
  );
}

/**
 * Passo intermediário — mostra tudo que vai gravar, com os mesmos rótulos do
 * formulário. Só o botão daqui é o `submit` de verdade; o botão do formulário
 * passou a ser `type="button"` e só troca este flag.
 *
 * Existe porque a tela do formulário sumia ao submeter e reaparecia a tela de
 * sucesso — o auditor não sabia se digitou certo antes de o Comando cobrar.
 */
function CartaoRevisao({
  data,
  turno,
  re,
  nomeGuerra,
  posto,
  funcao,
  fracao,
  auditou,
  quantidadeEfetiva,
  identificadores,
  motivo,
  justificativa,
  numeroParte,
  enviando,
  onCorrigir,
}: {
  data: string;
  turno: string;
  re: string;
  nomeGuerra: string;
  posto: string;
  funcao: string;
  fracao?: string;
  auditou: boolean | null;
  quantidadeEfetiva: number;
  identificadores: string[];
  motivo: string;
  justificativa: string;
  numeroParte: string;
  enviando: boolean;
  onCorrigir: () => void;
}) {
  return (
    <div className="space-y-4 rounded-xl border-2 border-vermelho/40 bg-tatico-super p-5 shadow-[0_10px_28px_rgba(202,2,2,0.12)]">
      <header className="border-b-2 border-vermelho/40 pb-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-vermelho">
          Confira antes de enviar
        </p>
        <h2 className="mt-1 font-serif text-lg font-bold uppercase tracking-wide text-branco">
          Revisão do lançamento
        </h2>
        <p className="mt-1 text-[12.5px] text-texto-suave">
          O envio só acontece quando você tocar em <strong>Confirmar e enviar</strong> abaixo.
        </p>
      </header>

      <section>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-texto-suave">
          Serviço
        </p>
        <LinhaEco rotulo="Data" valor={dataBr(data)} />
        <LinhaEco rotulo="Turno" valor={turno || "—"} />
      </section>

      <section>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-texto-suave">
          Auditor
        </p>
        <LinhaEco rotulo="RE" valor={re || "—"} />
        <LinhaEco
          rotulo="Nome"
          valor={[posto, nomeGuerra].filter(Boolean).join(" ") || "—"}
        />
        <LinhaEco rotulo="Função" valor={funcao || "—"} />
        {fracao && <LinhaEco rotulo="Fração" valor={fracao} />}
      </section>

      <section>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-texto-suave">
          Auditoria
        </p>
        <LinhaEco
          rotulo="Auditou?"
          valor={auditou === true ? "Sim" : auditou === false ? "Não" : "—"}
        />
        {auditou === true && (
          <>
            <LinhaEco
              rotulo="Quantidade"
              valor={<strong className="dados-destaque">{quantidadeEfetiva}</strong>}
            />
            <LinhaEco
              rotulo={`Identificadores (${identificadores.length})`}
              valor={
                identificadores.length ? (
                  <span className="dados block text-right text-[12.5px] leading-relaxed">
                    {identificadores.join(" · ")}
                  </span>
                ) : (
                  "—"
                )
              }
            />
          </>
        )}
        {motivo && <LinhaEco rotulo="Motivo" valor={motivo} />}
        {justificativa && <LinhaEco rotulo="Detalhe" valor={justificativa} />}
        {numeroParte && <LinhaEco rotulo="Nº da parte" valor={numeroParte} />}
      </section>

      <div className="flex flex-col-reverse gap-2 border-t border-borda pt-4 sm:flex-row">
        <button
          type="button"
          onClick={onCorrigir}
          disabled={enviando}
          className="min-h-14 flex-1 rounded-md border border-borda px-5 py-4 text-[13px] font-bold uppercase tracking-wide text-branco transition-colors hover:border-vermelho/40 disabled:opacity-40"
        >
          Voltar e corrigir
        </button>
        <button
          type="submit"
          disabled={enviando}
          className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-md border border-vermelho bg-vermelho px-5 py-4 text-[14px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-vermelho/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {enviando ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden /> Enviando…
            </>
          ) : (
            "Confirmar e enviar"
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * Tela de sucesso — desenhada para caber num print de celular.
 *
 * Antes: só o protocolo aparecia. O auditor tinha o número, mas não a prova do
 * QUE ficou gravado; conferência no Comando dependia de abrir a planilha. Aqui
 * o protocolo é destaque, o carimbo tem data e hora, e o eco dos campos vem
 * junto — um print resolve.
 */
function ComprovanteProtocolo({
  protocolo,
  duplicado,
  avisos,
  data,
  turno,
  re,
  nomeGuerra,
  posto,
  fracao,
  auditou,
  quantidadeEfetiva,
  identificadores,
  motivo,
  justificativa,
  numeroParte,
}: {
  protocolo: string;
  duplicado: boolean;
  avisos: string[];
  data: string;
  turno: string;
  re: string;
  nomeGuerra: string;
  posto: string;
  fracao?: string;
  auditou: boolean | null;
  quantidadeEfetiva: number;
  identificadores: string[];
  motivo: string;
  justificativa: string;
  numeroParte: string;
}) {
  /* Carimbo do momento em que a tela apareceu — o mesmo que o print vai
     mostrar. `useState` no init evita re-renderizações trocarem a hora se o
     React remontar o componente. */
  const [carimbo] = useState(() =>
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date())
  );

  return (
    <div className="rounded-xl border-2 border-sinal-conforme/50 bg-sinal-conforme-suave p-6 shadow-[0_10px_28px_rgba(22,163,74,0.14)]">
      <div className="text-center">
        <Check size={38} className="mx-auto text-sinal-conforme" aria-hidden />
        <h2 className="mt-3 font-serif text-xl font-bold uppercase tracking-wide text-branco">
          {duplicado ? "Lançamento já registrado" : "Lançamento registrado"}
        </h2>
        <div className="mt-3 inline-flex flex-col items-center rounded-lg border-2 border-sinal-conforme/40 bg-tatico-super px-5 py-3">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-texto-suave">
            Protocolo
          </span>
          <span className="dados-destaque mt-1 select-all text-[22px] leading-none">
            {protocolo || "—"}
          </span>
          <span className="mt-2 text-[11px] text-texto-suave">Emitido em {carimbo}</span>
        </div>
        <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-texto-suave">
          {duplicado
            ? "Este envio já havia chegado — o registro é o mesmo, não foi duplicado."
            : "Tire um print desta tela — protocolo, carimbo e resumo estão nele. O Comando confere por esse número."}
        </p>
      </div>

      <div className="mt-5 rounded-lg border border-borda bg-tatico-super/60 p-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-texto-suave">
          O que ficou gravado
        </p>
        <LinhaEco rotulo="Data / Turno" valor={`${dataBr(data)} · ${turno}`} />
        <LinhaEco
          rotulo="Auditor"
          valor={`${[posto, nomeGuerra].filter(Boolean).join(" ")} · RE ${re}${fracao ? ` · ${fracao}` : ""}`}
        />
        <LinhaEco
          rotulo="Auditou?"
          valor={auditou === true ? "Sim" : auditou === false ? "Não" : "—"}
        />
        {auditou === true && (
          <>
            <LinhaEco rotulo="Quantidade" valor={quantidadeEfetiva} />
            {identificadores.length > 0 && (
              <LinhaEco
                rotulo={`Identificadores (${identificadores.length})`}
                valor={
                  <span className="dados block text-right text-[12px] leading-relaxed">
                    {identificadores.join(" · ")}
                  </span>
                }
              />
            )}
          </>
        )}
        {motivo && <LinhaEco rotulo="Motivo" valor={motivo} />}
        {justificativa && <LinhaEco rotulo="Detalhe" valor={justificativa} />}
        {numeroParte && <LinhaEco rotulo="Nº da parte" valor={numeroParte} />}
      </div>

      {avisos.length > 0 && (
        <ul className="mt-4 space-y-2">
          {avisos.map((aviso) => (
            <li
              key={aviso}
              className="flex items-start gap-2 rounded-lg border border-borda px-3 py-2 text-[12.5px] text-texto-suave"
            >
              <Info size={14} className="mt-0.5 shrink-0" aria-hidden /> {aviso}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-12 flex-1 rounded-md border border-borda px-5 py-3 text-[13px] font-bold uppercase tracking-wide text-branco transition-colors hover:border-vermelho/40"
        >
          Fazer outro lançamento
        </button>
        <a
          href="/cop2026/dashboard"
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-md border border-vermelho/40 bg-vermelho/10 px-5 py-3 text-[13px] font-bold uppercase tracking-wide text-vermelho transition-colors hover:bg-vermelho/15"
        >
          Ver painel do Batalhão
        </a>
      </div>
    </div>
  );
}

/**
 * Caixa pré-ajustada de motivo — mesma peça para "não auditou" e "auditou
 * abaixo do mínimo". Escolha OBRIGATÓRIA entre um conjunto fechado; o detalhe
 * livre é opcional e vira o `justificativa` do lançamento no envio.
 *
 * O motivo escolhido viaja em `justificativa` também: a coluna do painel e o
 * CSV que o Comando distribui já leem esse campo, e criar uma coluna nova
 * exigiria migração de banco e recorte histórico. A convenção é
 * `MOTIVO — detalhe`, e o painel agrupa pelo prefixo antes do travessão.
 */
function CaixaMotivo({
  titulo,
  motivo,
  setMotivo,
  justificativa,
  setJustificativa,
  entrada,
}: {
  titulo: string;
  motivo: string;
  setMotivo: (v: string) => void;
  justificativa: string;
  setJustificativa: (v: string) => void;
  entrada: string;
}) {
  return (
    <div className="space-y-3">
      <fieldset>
        <legend className="mb-2 text-[12px] font-bold uppercase tracking-wide text-texto-suave">
          {titulo}
        </legend>
        <div className="space-y-1.5">
          {MOTIVOS_ABAIXO_DO_MINIMO.map((opcao) => (
            <label
              key={opcao}
              className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-[14px] transition-colors ${
                motivo === opcao
                  ? "border-vermelho bg-vermelho/10 text-branco"
                  : "border-borda text-texto-suave hover:border-vermelho/40"
              }`}
            >
              <input
                type="radio"
                name="motivoAbaixoMinimo"
                value={opcao}
                checked={motivo === opcao}
                onChange={() => setMotivo(opcao)}
                required
                className="mt-1 accent-vermelho"
              />
              <span>{opcao}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Campo rotulo="Detalhe (opcional)">
        <textarea
          name="justificativa"
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
          rows={2}
          placeholder="Nº da ocorrência, contexto, ou o que for útil para a auditoria."
          className={`${entrada} resize-y`}
        />
      </Campo>
    </div>
  );
}
