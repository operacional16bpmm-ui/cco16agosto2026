"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Building2, Check, Info } from "lucide-react";

import type { CpaPendente, Unidade } from "@/lib/db/cop2026-unidade";
import { batalhoesDoCpaAction, nomearCpaAction, type UnidadeState } from "./actions";

/**
 * CPA → Batalhão → Fração.
 *
 * A hierarquia foi derivada do DEJEM em 03/09/2026 a partir do código OPM de 9
 * dígitos (ver `supabase/migrations/029_cop_unidade.sql`). O AGRUPAMENTO é
 * confiável — o código diz quais batalhões pendem do mesmo comando, e a
 * conferência do 16º BPM/M sob o CPA/M-5 fecha. O NOME do comando não existe
 * ligado a esse código em lugar nenhum, e por isso é digitado aqui, uma vez.
 *
 * Por que nomear à mão em vez de deduzir: carimbar um CPA errado num sistema
 * que a Corregedoria e o Ministério Público vão ler é pior do que deixar em
 * branco. Em branco alguém pergunta; errado ninguém percebe.
 *
 * O que a tela mostra é NOME. O código aparece só na etiqueta cinza ao lado,
 * porque o Comando precisa conseguir conferir contra o DEJEM — em nenhuma outra
 * superfície ele aparece.
 */

const VAZIO: UnidadeState = { ok: false, erro: null, aviso: null };

function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <span className="dados rounded-sm bg-branco/10 px-1.5 py-0.5 text-[10px] font-black tracking-wider text-branco/45">
      {children}
    </span>
  );
}

/** Uma linha de comando ainda sem nome — o trabalho pendente. */
function LinhaPendente({ cpa }: { cpa: CpaPendente }) {
  const [estado, acao] = useActionState(nomearCpaAction, VAZIO);

  return (
    <li className="rounded-lg border border-branco/10 bg-branco/[0.03] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Etiqueta>{cpa.cod}</Etiqueta>
        <span className="text-[12px] font-semibold text-branco/70">
          {cpa.batalhoes} batalh{cpa.batalhoes === 1 ? "ão" : "ões"}
        </span>
      </div>

      {/* Quais batalhões pendem daqui — é por eles que o Comando reconhece o
          CPA. Sem esta lista a tela pediria para nomear um número. */}
      <p className="mt-1.5 text-[12px] leading-snug text-branco/55">{cpa.quais}</p>

      <form action={acao} className="mt-2.5 flex flex-wrap items-center gap-2">
        <input type="hidden" name="cod" value={cpa.cod} />
        <input
          name="nome"
          required
          maxLength={60}
          placeholder="Nome do comando (ex.: CPA/M-5)"
          className="min-w-[220px] flex-1 rounded-md border border-branco/15 bg-tatico-fundo px-3 py-1.5 text-[13px] text-branco placeholder:text-branco/30 focus:border-ouro focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-ouro px-3 py-1.5 text-[12px] font-black uppercase tracking-wide text-tatico-fundo transition-opacity hover:opacity-85"
        >
          Nomear
        </button>
      </form>

      {estado.erro && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-vermelho">
          <AlertTriangle size={13} /> {estado.erro}
        </p>
      )}
      {estado.aviso && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ouro">
          <Check size={13} /> {estado.aviso}
        </p>
      )}
    </li>
  );
}

/** Navegador da árvore: escolhe o CPA, vê os batalhões dele. */
function Navegador({ cpas }: { cpas: Unidade[] }) {
  const [sel, setSel] = useState<string>("");
  const [batalhoes, setBatalhoes] = useState<Unidade[]>([]);
  const [carregando, setCarregando] = useState(false);

  /* Carga sob demanda: a árvore inteira tem 3.895 nós e mandá-la para o
     navegador de uma vez só travaria a tela para mostrar 6 linhas. */
  async function escolher(cod: string) {
    setSel(cod);
    setBatalhoes([]);
    if (!cod) return;
    setCarregando(true);
    try {
      setBatalhoes(await batalhoesDoCpaAction(cod));
    } finally {
      setCarregando(false);
    }
  }

  const nomeados = cpas.filter((c) => c.cpaNome);

  return (
    <div className="rounded-xl border border-branco/10 bg-branco/[0.03] p-4">
      <div className="flex items-center gap-2">
        <Building2 size={15} className="text-ouro" />
        <h2 className="text-[13px] font-black uppercase tracking-wide text-branco/80">
          Conferir a árvore
        </h2>
      </div>

      <select
        value={sel}
        onChange={(e) => escolher(e.target.value)}
        className="mt-3 w-full max-w-md rounded-md border border-branco/15 bg-tatico-fundo px-3 py-2 text-[13px] text-branco focus:border-ouro focus:outline-none"
      >
        <option value="">Escolha o comando…</option>
        {nomeados.map((c) => (
          <option key={c.cod} value={c.cod}>
            {c.nome}
          </option>
        ))}
      </select>

      {nomeados.length === 0 && (
        <p className="mt-2 text-[12px] text-branco/45">
          Nenhum comando nomeado ainda — nomeie ao menos um na lista acima.
        </p>
      )}

      {carregando && <p className="mt-3 text-[12px] text-branco/45">Carregando…</p>}

      {batalhoes.length > 0 && (
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {batalhoes.map((b) => (
            <li
              key={b.cod}
              className="flex items-center justify-between gap-2 rounded-md bg-branco/[0.04] px-3 py-1.5"
            >
              <span className="truncate text-[12.5px] text-branco/80">{b.nome}</span>
              <Etiqueta>{b.cod}</Etiqueta>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PainelUnidades({
  cpas,
  pendentes,
  resumo,
  fonte,
}: {
  cpas: Unidade[];
  pendentes: CpaPendente[];
  resumo: { cpas: number; batalhoes: number; fracoes: number; cpasSemNome: number };
  fonte: "planilha" | "uniao" | "banco";
}) {
  const N = new Intl.NumberFormat("pt-BR");

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-5 py-8">
      <div>
        <h1 className="font-serif text-xl font-bold uppercase tracking-wide text-branco">
          Unidades
        </h1>
        <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-branco/55">
          A hierarquia que o sistema usa quando deixar de atender um batalhão só. Foi derivada do
          DEJEM; o agrupamento veio pronto, o nome de cada comando é digitado aqui.
        </p>
      </div>

      {/* Enquanto a fonte for a planilha, esta tela organiza o cadastro mas não
          muda número nenhum do painel — o mesmo aviso honesto da tela de Metas. */}
      {fonte === "planilha" && (
        <p className="flex items-start gap-2 rounded-lg border border-ouro/25 bg-ouro/[0.07] p-3 text-[12.5px] leading-snug text-branco/70">
          <Info size={14} className="mt-0.5 shrink-0 text-ouro" />
          <span>
            A fonte do painel ainda é a <strong>planilha</strong>. O cadastro abaixo já vale e já
            está vinculado ao histórico, mas o isolamento de dado entre unidades só passa a existir
            quando <span className="dados">COP2026_FONTE</span> virar <strong>banco</strong>.
          </span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { r: "Comandos", v: N.format(resumo.cpas) },
          { r: "Batalhões", v: N.format(resumo.batalhoes) },
          { r: "Frações", v: N.format(resumo.fracoes) },
          { r: "Sem nome", v: N.format(resumo.cpasSemNome), alerta: resumo.cpasSemNome > 0 },
        ].map((m) => (
          <div key={m.r} className="rounded-lg border border-branco/10 bg-branco/[0.03] p-3">
            <p className="rotulo-dado text-branco/45">{m.r}</p>
            <p
              className={`dados mt-1 text-[22px] font-black ${
                m.alerta ? "text-ouro" : "text-branco"
              }`}
            >
              {m.v}
            </p>
          </div>
        ))}
      </div>

      {pendentes.length > 0 && (
        <div>
          <h2 className="text-[13px] font-black uppercase tracking-wide text-branco/80">
            Comandos a nomear ({pendentes.length})
          </h2>
          <p className="mt-1 max-w-3xl text-[12.5px] leading-snug text-branco/50">
            Cada bloco é um grupo de batalhões que o DEJEM diz pertencerem ao mesmo comando. Os
            nomes dos batalhões estão à vista para você reconhecer qual comando é.
          </p>
          <ul className="mt-3 grid gap-2.5 lg:grid-cols-2">
            {pendentes.map((c) => (
              <LinhaPendente key={c.cod} cpa={c} />
            ))}
          </ul>
        </div>
      )}

      <Navegador cpas={cpas} />
    </div>
  );
}
