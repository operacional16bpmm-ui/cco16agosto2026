"use client";

import { useActionState } from "react";
import {
  AlertTriangle,
  Check,
  DownloadCloud,
  Info,
  RotateCcw,
  ShieldOff,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  alternarAtivoAction,
  excluirAutorizadoAction,
  importarDaEnvAction,
  incluirAutorizadoAction,
  type AutorizadoState,
} from "./actions";

export type AutorizadoLinha = {
  email: string;
  nome: string | null;
  observacao: string | null;
  ativo: boolean;
  criado_por: string | null;
  criado_em: string | null;
};

const vazio: AutorizadoState = { ok: false, error: null, aviso: null };

const DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

function quando(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : DATA.format(d);
}

export function PainelAutorizados({
  itens,
  origem,
  erro,
  admins,
  emailAtual,
}: {
  itens: AutorizadoLinha[];
  origem: "banco" | "env";
  erro: string | null;
  admins: string[];
  emailAtual: string;
}) {
  const ativos = itens.filter((i) => i.ativo).length;

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-5 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl font-bold uppercase tracking-wide text-branco">
            Autorizados do painel
          </h1>
          <p className="mt-1 text-[13px] text-texto-suave">
            Contas Google que abrem o Dashboard de controle e o Briefing executivo. A inclusão e a
            revogação valem na hora, sem republicar o site.
          </p>
        </div>
        <p className="text-[12px] text-texto-suave">
          <span className="dados-destaque">{ativos}</span> ativo{ativos === 1 ? "" : "s"} ·{" "}
          <span className="dados">{itens.length}</span> na lista
        </p>
      </div>

      {erro && (
        <Faixa tom="erro" icone={<AlertTriangle size={15} aria-hidden />}>
          {erro}
        </Faixa>
      )}

      {origem === "env" && !erro && <AvisoOrigemEnv total={itens.length} />}

      <FormularioInclusao />

      <div className="overflow-x-auto rounded-xl border border-borda bg-tatico-super">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-borda text-[10px] uppercase tracking-wide text-texto-suave">
              <Th>E-mail</Th>
              <Th>Nome</Th>
              <Th>Situação</Th>
              <Th>Incluído por</Th>
              <Th>Quando</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-texto-suave">
                  Nenhum e-mail na lista. Enquanto ela estiver vazia, ninguém abre o painel.
                </td>
              </tr>
            )}
            {itens.map((item) => (
              <Linha
                key={item.email}
                item={item}
                somenteLeitura={origem === "env"}
                ehAdmin={admins.includes(item.email)}
                ehVoce={item.email === emailAtual}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[12px] leading-relaxed text-texto-suave">
        <Info size={13} className="mr-1 inline align-[-2px]" aria-hidden />
        Quem administra esta tela vem da variável de ambiente{" "}
        <code className="dados">COP2026_ADMINS</code>, não da lista acima — é o que impede o
        administrador de se trancar do lado de fora. Um endereço que não seja conta Google (Outlook,
        Hotmail) entra na lista mas não abre o painel enquanto não existir uma conta Google com ele.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ blocos */

function AvisoOrigemEnv({ total }: { total: number }) {
  const [state, action, pending] = useActionState(importarDaEnvAction, vazio);
  return (
    <Faixa tom="atencao" icone={<AlertTriangle size={15} aria-hidden />}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>
          A lista ainda vem da variável de ambiente{" "}
          <code className="dados">COP2026_EMAILS_AUTORIZADOS</code> ({total} e-mail
          {total === 1 ? "" : "s"}). Importe para o banco para poder incluir e revogar por esta
          tela.
        </span>
        <form action={action}>
          <button type="submit" disabled={pending} className={botaoPrimario}>
            <DownloadCloud size={14} aria-hidden />
            {pending ? "Importando…" : "Importar para o banco"}
          </button>
        </form>
      </div>
      {state.error && <p className="mt-2 text-vermelho">{state.error}</p>}
      {state.aviso && <p className="mt-2 text-sinal-conforme">{state.aviso}</p>}
    </Faixa>
  );
}

function FormularioInclusao() {
  const [state, action, pending] = useActionState(incluirAutorizadoAction, vazio);
  return (
    <div className="rounded-xl border border-borda bg-tatico-super p-5">
      <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Campo rotulo="E-mail da conta Google">
          <input
            name="email"
            type="email"
            required
            autoComplete="off"
            placeholder="nome@gmail.com"
            className={entrada}
          />
        </Campo>
        <Campo rotulo="Nome (opcional)">
          <input name="nome" type="text" placeholder="Maj PM Zochio" className={entrada} />
        </Campo>
        <Campo rotulo="Observação (opcional)">
          <input name="observacao" type="text" placeholder="P/3 — Auditoria" className={entrada} />
        </Campo>
        <div className="flex items-end">
          <button type="submit" disabled={pending} className={botaoPrimario}>
            <UserPlus size={14} aria-hidden />
            {pending ? "Incluindo…" : "Incluir"}
          </button>
        </div>
      </form>
      {state.error && <p className="mt-3 text-[13px] text-vermelho">{state.error}</p>}
      {state.ok && !state.aviso && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-sinal-conforme">
          <Check size={14} aria-hidden /> E-mail incluído. Já vale no próximo acesso.
        </p>
      )}
      {state.aviso && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-sinal-atencao">
          <AlertTriangle size={14} aria-hidden /> {state.aviso}
        </p>
      )}
    </div>
  );
}

function Linha({
  item,
  somenteLeitura,
  ehAdmin,
  ehVoce,
}: {
  item: AutorizadoLinha;
  somenteLeitura: boolean;
  ehAdmin: boolean;
  ehVoce: boolean;
}) {
  const [alt, acaoAlternar, altPending] = useActionState(alternarAtivoAction, vazio);
  const [exc, acaoExcluir, excPending] = useActionState(excluirAutorizadoAction, vazio);
  const erro = alt.error ?? exc.error;

  return (
    <tr className="border-b border-borda/60 last:border-0">
      <td className="px-4 py-3">
        <span className="dados">{item.email}</span>
        {ehAdmin && (
          <span className="ml-2 rounded border border-azul/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-azul">
            Admin
          </span>
        )}
        {erro && <p className="mt-1 text-[12px] text-vermelho">{erro}</p>}
      </td>
      <td className="px-4 py-3 text-texto-suave">{item.nome ?? "—"}</td>
      <td className="px-4 py-3">
        {item.ativo ? (
          <span className="text-sinal-conforme">Ativo</span>
        ) : (
          <span className="text-texto-suave">Revogado</span>
        )}
      </td>
      <td className="px-4 py-3 text-texto-suave">{item.criado_por ?? "—"}</td>
      <td className="px-4 py-3 tabular text-texto-suave">{quando(item.criado_em)}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap justify-end gap-2">
          {somenteLeitura ? (
            <span className="text-[12px] text-texto-suave">importar para editar</span>
          ) : (
            <>
              <form action={acaoAlternar}>
                <input type="hidden" name="email" value={item.email} />
                <input type="hidden" name="ativar" value={item.ativo ? "0" : "1"} />
                <button
                  type="submit"
                  disabled={altPending}
                  className={botaoSecundario}
                  title={
                    ehAdmin && item.ativo
                      ? "Este endereço administra a tela por COP2026_ADMINS e continuará entrando mesmo revogado."
                      : undefined
                  }
                >
                  {item.ativo ? (
                    <>
                      <ShieldOff size={13} aria-hidden /> Revogar
                    </>
                  ) : (
                    <>
                      <RotateCcw size={13} aria-hidden /> Reativar
                    </>
                  )}
                </button>
              </form>
              <form
                action={acaoExcluir}
                onSubmit={(e) => {
                  if (!confirm(`Excluir ${item.email} da lista de autorizados?`)) e.preventDefault();
                }}
              >
                <input type="hidden" name="email" value={item.email} />
                <button
                  type="submit"
                  disabled={excPending || ehVoce}
                  className={botaoPerigo}
                  title={ehVoce ? "Você não pode excluir o próprio acesso." : undefined}
                >
                  <Trash2 size={13} aria-hidden /> Excluir
                </button>
              </form>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------- primitivos */

function Faixa({
  tom,
  icone,
  children,
}: {
  tom: "erro" | "atencao";
  icone: React.ReactNode;
  children: React.ReactNode;
}) {
  const cor =
    tom === "erro"
      ? "border-vermelho/40 bg-vermelho/5 text-vermelho"
      : "border-sinal-atencao/40 bg-sinal-atencao/5 text-branco";
  return (
    <div className={`rounded-xl border px-4 py-3 text-[13px] ${cor}`}>
      <div className="flex gap-2">
        <span className="mt-0.5 shrink-0">{icone}</span>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-3 font-semibold ${className ?? ""}`}>{children}</th>;
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-branco/45">
        {rotulo}
      </span>
      {children}
    </label>
  );
}

const entrada =
  "w-full rounded-md border border-branco/15 bg-tatico-fundo px-3 py-2 text-sm text-branco placeholder:text-branco/30 outline-none focus:border-azul focus:ring-1 focus:ring-azul disabled:opacity-40";

const botaoPrimario =
  "inline-flex items-center gap-2 rounded-md bg-azul px-4 py-2 text-xs font-semibold text-branco transition-colors hover:bg-azul-escuro disabled:opacity-60";

const botaoSecundario =
  "inline-flex items-center gap-1.5 rounded-md border border-branco/15 px-3 py-1.5 text-xs font-medium text-branco/70 transition-colors hover:bg-branco/5 hover:text-branco disabled:opacity-50";

const botaoPerigo =
  "inline-flex items-center gap-1.5 rounded-md border border-vermelho/40 px-3 py-1.5 text-xs font-medium text-vermelho transition-colors hover:bg-vermelho/10 disabled:opacity-50";
