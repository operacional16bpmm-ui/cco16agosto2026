"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Loader2, Send } from "lucide-react";

import { ORDEM_SUBUNIDADES, ROTULO_SUBUNIDADE } from "@/lib/cop2026";
import {
  AJUDA_ABRANGENCIA,
  AJUDA_EFEITO,
  EFEITOS,
  PADRAO_IDENTIFICADOR,
  ROTULO_ABRANGENCIA,
  ROTULO_EFEITO,
  lerIdentificadores,
  type Abrangencia,
  type Efeito,
} from "@/lib/cop2026-inconsistencia";
import { enviarRelatoAction } from "./actions";
import { ESTADO_INICIAL, type RelatoState } from "./estado";

/**
 * Formulário de relato de problema do sistema.
 *
 * Escrito para ser preenchido em pé, no celular, por quem está com pressa e
 * acabou de descobrir que a COP não funciona. Três decisões seguem daí:
 *
 * - **Nenhum campo pune.** Só bloqueiam os quatro que provam o aviso: fração,
 *   quando começou, o que parou e quem relatou. Tudo o mais entra como está e
 *   vira pendência de correção no admin.
 * - **O padrão do identificador aparece na tela**, com exemplo — pedido
 *   explícito do Fabrício em 08/09/2026 ("o usuário deve colocar o padrão
 *   certo; deixe isso bem nítido para ele entender no formulário"). Ninguém
 *   acerta um formato que nunca viu, e era isso que produzia os 338 IDs
 *   recusados de agosto.
 * - **Ajuda a um toque, o tempo inteiro.** O botão flutuante de WhatsApp fica
 *   visível em qualquer rolagem: quem trava no meio do preenchimento tem de ter
 *   uma saída que não seja desistir de avisar.
 */

const CAMPO =
  "w-full rounded-lg border-2 border-slate-300 bg-white px-3 py-2.5 text-[15px] text-slate-900 outline-none transition-colors focus:border-[#ca0202] focus:ring-2 focus:ring-[#ca0202]/20";
const ROTULO = "block text-[12px] font-black uppercase tracking-[0.1em] text-slate-700";

function Campo({
  rotulo,
  ajuda,
  obrigatorio,
  children,
}: {
  rotulo: string;
  ajuda?: React.ReactNode;
  obrigatorio?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={ROTULO}>
        {rotulo}
        {obrigatorio && <span className="ml-1 text-[#ca0202]">*</span>}
      </span>
      {ajuda && <span className="text-[12.5px] leading-snug text-slate-600">{ajuda}</span>}
      {children}
    </div>
  );
}

function hojeSP(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function FormularioInconsistencia({ whatsappAjuda }: { whatsappAjuda: string }) {
  /* Um identificador por submissão, criado no primeiro envio e guardado em
     ref: é o que desduplica o clique duplo, que no 4G da viatura é a regra.
     Em ref e não em estado — gerar dentro de um efeito para colocar em estado
     dispara render em cascata (e o lint acusa), e o valor não precisa
     participar de render nenhum. Mesmo padrão do formulário de lançamento. */
  const submissao = useRef("");
  const idDaSubmissao = () => {
    if (!submissao.current) submissao.current = crypto.randomUUID();
    return submissao.current;
  };

  const [estado, enviar, enviando] = useActionState<RelatoState, FormData>(
    async (anterior, formData) => {
      formData.set("idSubmissao", idDaSubmissao());
      return enviarRelatoAction(anterior, formData);
    },
    ESTADO_INICIAL
  );

  const [subunidade, setSubunidade] = useState("");
  const [emCurso, setEmCurso] = useState(true);
  const [abrangencia, setAbrangencia] = useState<Abrangencia>("total");
  const [efeitos, setEfeitos] = useState<Efeito[]>([]);
  const [ids, setIds] = useState("");

  const lidos = useMemo(() => lerIdentificadores(ids), [ids]);
  const naoReconhecidos = lidos.filter((i) => !i.reconhecido);

  const alternar = (e: Efeito) =>
    setEfeitos((atual) => (atual.includes(e) ? atual.filter((x) => x !== e) : [...atual, e]));

  if (estado.ok) {
    return (
      <div className="rounded-2xl border-2 border-emerald-500/50 bg-emerald-50 p-6">
        <p className="flex items-center gap-2 font-serif text-xl font-black text-emerald-800">
          <CheckCircle2 size={22} aria-hidden />
          {estado.duplicado ? "Este relato já estava registrado" : "Relato registrado"}
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-emerald-900">
          Protocolo <strong className="dados tracking-wider">{estado.protocolo}</strong>. Anote esse
          número: é ele que prova, com data e hora, que a sua fração comunicou.
        </p>

        {/* O aviso automático é reforço, e o relator precisa saber se saiu.
            Esconder a falha aqui recriaria o problema que o formulário existe
            para resolver: alguém achando que avisou. */}
        {estado.avisoEnviado === false && (
          <p className="mt-3 flex items-start gap-2 rounded-lg border-2 border-amber-500/50 bg-amber-50 p-3 text-[14px] leading-relaxed text-amber-900">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              O registro está gravado, mas <strong>o aviso automático não saiu</strong>. Comunique
              também pelo rádio ou pelo telefone do Batalhão — e informe o protocolo acima.
            </span>
          </p>
        )}

        {estado.avisos.length > 0 && (
          <ul className="mt-3 space-y-1 text-[13.5px] text-emerald-900/85">
            {estado.avisos.map((a) => (
              <li key={a}>• {a}</li>
            ))}
          </ul>
        )}

        <a
          href="/cop2026"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-[14px] font-bold text-white hover:bg-emerald-800"
        >
          Voltar ao início
        </a>
      </div>
    );
  }

  return (
    <>
      <form action={enviar} className="flex flex-col gap-6">
        {estado.erros.length > 0 && (
          <div
            role="alert"
            className="rounded-xl border-2 border-[#ca0202]/45 bg-[#fdf0f0] p-4 text-[14px] leading-relaxed text-slate-800"
          >
            <p className="mb-1 flex items-center gap-2 font-black text-[#ca0202]">
              <AlertTriangle size={17} aria-hidden />
              Falta corrigir antes de enviar
            </p>
            <ul className="space-y-1">
              {estado.erros.map((e) => (
                <li key={e}>• {e}</li>
              ))}
            </ul>
          </div>
        )}

        <Campo rotulo="Companhia / fração" obrigatorio>
          <select
            name="subunidade"
            value={subunidade}
            onChange={(ev) => setSubunidade(ev.target.value)}
            className={CAMPO}
            required
          >
            <option value="">Selecione…</option>
            {ORDEM_SUBUNIDADES.map((s) => (
              <option key={s} value={s}>
                {ROTULO_SUBUNIDADE[s] ?? s}
              </option>
            ))}
          </select>
        </Campo>

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="sr-only">Início da inconsistência</legend>
          <Campo rotulo="Começou no dia" obrigatorio>
            <input type="date" name="dataInicio" max={hojeSP()} className={CAMPO} required />
          </Campo>
          <Campo rotulo="Começou às" obrigatorio ajuda="Hora do relógio, horário de Brasília.">
            <input type="time" name="horaInicio" className={CAMPO} required />
          </Campo>
        </fieldset>

        <Campo
          rotulo="O sistema já voltou?"
          ajuda="Se ainda estiver fora, deixe marcado — o painel conta o tempo sozinho até alguém encerrar."
        >
          <label className="flex items-center gap-2.5 rounded-lg border-2 border-slate-300 bg-white px-3 py-2.5">
            <input
              type="checkbox"
              name="emCurso"
              value="sim"
              checked={emCurso}
              onChange={(ev) => setEmCurso(ev.target.checked)}
              className="h-4 w-4 accent-[#ca0202]"
            />
            <span className="text-[15px] text-slate-800">Ainda está fora do ar</span>
          </label>
        </Campo>

        {!emCurso && (
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="sr-only">Normalização</legend>
            <Campo rotulo="Normalizou no dia">
              <input type="date" name="dataFim" max={hojeSP()} className={CAMPO} />
            </Campo>
            <Campo rotulo="Normalizou às">
              <input type="time" name="horaFim" className={CAMPO} />
            </Campo>
          </fieldset>
        )}

        <Campo rotulo="Alcance" obrigatorio>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["total", "parcial"] as Abrangencia[]).map((a) => (
              <label
                key={a}
                className={`flex cursor-pointer flex-col gap-0.5 rounded-lg border-2 px-3 py-2.5 transition-colors ${
                  abrangencia === a
                    ? "border-[#ca0202] bg-[#fdf0f0]"
                    : "border-slate-300 bg-white hover:border-slate-400"
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="abrangencia"
                    value={a}
                    checked={abrangencia === a}
                    onChange={() => setAbrangencia(a)}
                    className="h-4 w-4 accent-[#ca0202]"
                  />
                  <span className="text-[15px] font-bold text-slate-800">
                    {ROTULO_ABRANGENCIA[a]}
                  </span>
                </span>
                <span className="pl-6 text-[12.5px] leading-snug text-slate-600">
                  {AJUDA_ABRANGENCIA[a]}
                </span>
              </label>
            ))}
          </div>
        </Campo>

        <Campo rotulo="O que deixou de funcionar" obrigatorio ajuda="Pode marcar mais de um.">
          <div className="grid gap-2 sm:grid-cols-2">
            {EFEITOS.map((e) => (
              <label
                key={e}
                className={`flex cursor-pointer flex-col gap-0.5 rounded-lg border-2 px-3 py-2.5 transition-colors ${
                  efeitos.includes(e)
                    ? "border-[#ca0202] bg-[#fdf0f0]"
                    : "border-slate-300 bg-white hover:border-slate-400"
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="efeitos"
                    value={e}
                    checked={efeitos.includes(e)}
                    onChange={() => alternar(e)}
                    className="h-4 w-4 accent-[#ca0202]"
                  />
                  <span className="text-[15px] font-bold text-slate-800">{ROTULO_EFEITO[e]}</span>
                </span>
                <span className="pl-6 text-[12.5px] leading-snug text-slate-600">
                  {AJUDA_EFEITO[e]}
                </span>
              </label>
            ))}
          </div>
        </Campo>

        {/* O PADRÃO DO IDENTIFICADOR, à vista. Ver a nota do componente. */}
        <Campo
          rotulo="ID de mídia ou ID de gravação"
          ajuda="Só se você já tinha o identificador em mãos. Sem ele o relato vale do mesmo jeito."
        >
          <div className="mb-1 grid gap-2 sm:grid-cols-2">
            {(["midia", "gravacao"] as const).map((k) => (
              <div
                key={k}
                className="rounded-lg border-2 border-slate-200 bg-slate-50 px-3 py-2 text-[12.5px] leading-snug"
              >
                <p className="font-black uppercase tracking-wider text-slate-700">
                  {PADRAO_IDENTIFICADOR[k].rotulo}
                </p>
                <p className="text-slate-600">{PADRAO_IDENTIFICADOR[k].formato}</p>
                <p className="dados mt-1 break-all rounded bg-white px-1.5 py-1 text-[11.5px] text-slate-800">
                  {PADRAO_IDENTIFICADOR[k].exemplo}
                </p>
              </div>
            ))}
          </div>
          <textarea
            name="identificadores"
            rows={3}
            value={ids}
            onChange={(ev) => setIds(ev.target.value)}
            placeholder="Cole aqui. Pode colar vários de uma vez, um por linha."
            className={CAMPO}
          />
          {lidos.length > 0 && (
            <p
              className={`text-[12.5px] leading-snug ${
                naoReconhecidos.length ? "text-amber-700" : "text-emerald-700"
              }`}
            >
              {naoReconhecidos.length === 0 ? (
                <>
                  <CheckCircle2 size={13} className="mr-1 inline" aria-hidden />
                  {lidos.length} identificador{lidos.length === 1 ? "" : "es"} no padrão certo.
                </>
              ) : (
                <>
                  <Info size={13} className="mr-1 inline" aria-hidden />
                  {naoReconhecidos.length} de {lidos.length} não confere com os padrões acima.{" "}
                  <strong>O relato vale mesmo assim</strong> — a diferença fica registrada para
                  correção.
                </>
              )}
            </p>
          )}
        </Campo>

        <Campo
          rotulo="O que aconteceu"
          ajuda="Uma ou duas frases. O que você tentou fazer e o que o sistema respondeu."
        >
          <textarea name="descricao" rows={4} className={CAMPO} />
        </Campo>

        <fieldset className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
          <legend className={`${ROTULO} mb-1.5`}>
            Quem está relatando <span className="text-[#ca0202]">*</span>
          </legend>
          <Campo rotulo="RE" obrigatorio>
            <input name="re" inputMode="numeric" className={CAMPO} required />
          </Campo>
          <Campo rotulo="Nome" obrigatorio>
            <input name="nome" className={CAMPO} required />
          </Campo>
        </fieldset>

        <button
          type="submit"
          disabled={enviando}
          className="inline-flex min-h-13 items-center justify-center gap-2.5 rounded-xl bg-gradient-to-br from-[#d50909] to-[#a90000] px-7 py-3.5 text-[16px] font-black text-white shadow-[0_10px_24px_rgba(126,0,0,0.32)] transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
        >
          {enviando ? (
            <>
              <Loader2 size={18} className="animate-spin" aria-hidden /> Registrando…
            </>
          ) : (
            <>
              <Send size={18} aria-hidden /> Registrar o problema
            </>
          )}
        </button>
      </form>

      <AjudaWhatsApp numero={whatsappAjuda} subunidade={subunidade} />
    </>
  );
}

/**
 * Botão flutuante de ajuda por WhatsApp.
 *
 * Pedido do Fabrício em 08/09/2026: "coloque no formulário um botão flutuando
 * de pedido de ajuda pelo WhatsApp caso ele encontre um erro ou não consiga
 * terminar o preenchimento por algum motivo". A mensagem já vai preenchida com
 * a fração escolhida — quem trava no formulário não vai redigir contexto.
 *
 * `nao-imprime` porque botão flutuante em PDF é uma mancha no meio da folha.
 */
function AjudaWhatsApp({ numero, subunidade }: { numero: string; subunidade: string }) {
  const fracao = subunidade ? ` (${ROTULO_SUBUNIDADE[subunidade] ?? subunidade})` : "";
  const msg = encodeURIComponent(
    `Preciso de ajuda para registrar um problema da COP no portal do 16º BPM/M${fracao}.`
  );
  return (
    <a
      href={`https://wa.me/${numero}?text=${msg}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Pedir ajuda pelo WhatsApp"
      className="nao-imprime fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-[14px] font-black text-white shadow-[0_10px_28px_rgba(0,0,0,0.28)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#07182d]"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
        <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.86 1.21 3.06c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13h-.01c-1.5 0-2.97-.4-4.25-1.17l-.3-.18-3.16.83.84-3.08-.2-.32a8.2 8.2 0 0 1-1.26-4.39c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.25 8.24z" />
      </svg>
      Preciso de ajuda
    </a>
  );
}
