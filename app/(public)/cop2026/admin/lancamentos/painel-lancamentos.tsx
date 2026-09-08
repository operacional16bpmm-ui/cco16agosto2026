"use client";

import { Fragment, useActionState, useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronDown, Download, FilterX, Trash2 } from "lucide-react";

import { ROTULO_SUBUNIDADE, ORDEM_SUBUNIDADES } from "@/lib/cop2026";
import { OPCOES_TURNO } from "@/lib/cop2026-lancamento";
import { RELATORIOS_MENSAIS } from "@/lib/cop2026-relatorios";
import {
  excluirLancamentoAction,
  reclassificarAction,
  type ManejoState,
} from "./actions";

/**
 * Planilha de Lançamentos — a conferência detalhada do Comando.
 *
 * A tela nasceu como manejo (excluir e reclassificar) e virou, em 08/09/2026, o
 * lugar onde o superior lê **registro a registro tudo o que a tropa declarou**:
 * determinação do Fabricio, que a tirou de trás do gate de administrador e
 * pediu "o máximo de informações possíveis, bem esmiuçado, ocupando a tela toda,
 * com todos os filtros possíveis".
 *
 * TRÊS DECISÕES QUE SUSTENTAM O DESENHO
 *
 * 1. **Resumo na linha, tudo no detalhe.** Dezoito campos por lançamento não
 *    cabem numa linha legível nem no monitor do Comando. A linha traz o que se
 *    compara varrendo a lista (data, auditor, fração, declarado); o resto abre
 *    num painel embaixo dela, sem sair da página nem perder o filtro.
 * 2. **Filtro no cliente.** A lista vem inteira do servidor (teto de 2.000) e
 *    cabe em memória com folga; filtrar aqui torna a conferência instantânea —
 *    o Comando alterna agosto e setembro sem esperar rede.
 * 3. **A divergência entre a fração declarada e a da relação do efetivo NÃO
 *    aparece.** Ela está gravada em `payload_bruto.subunidadeRoster`, mas a
 *    decisão de 08/09 é que vale o declarado — exibi-la aqui reintroduziria
 *    pela tela o julgamento que a regra aboliu.
 */

type Evidencia = { bruto: string; posicao: number; descartada: boolean };

export type LinhaLancamento = {
  id: string;
  data_auditoria: string;
  hora: string | null;
  turno: string;
  re: string;
  nome_guerra: string;
  posto: string | null;
  funcao: string | null;
  subunidade: string;
  unidade_cod: string | null;
  auditou: boolean;
  videos_declarados: number;
  videos_contados: number;
  videos_validos: number;
  numero_parte: string | null;
  justificativa: string | null;
  vinculo_pendente: boolean;
  retroativo: boolean;
  origem: string;
  criado_em: string;
  criado_por_email: string | null;
  payload_bruto: {
    quantidadeDeclarada?: number;
    recusas?: { bruto: string; motivo: string }[];
    duplicadasNoEnvio?: string[];
  } | null;
  cop_evidencia?: Evidencia[] | null;
};

export type Cadeia = { fracao: string; batalhao: string; comando: string };

const vazio: ManejoState = { ok: false, error: null, aviso: null };

/** Protocolo: os 8 primeiros do uuid, como no comprovante que o PM guarda. */
function protocolo(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function dataBr(iso: string): string {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

function carimbo(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
}

/**
 * A justificativa guarda `MOTIVO — detalhe`, convenção do formulário: o motivo
 * vem de lista fechada e o detalhe é livre. Separar aqui é o que permite ler a
 * coluna "motivo" sem o texto corrido junto.
 */
function partirMotivo(justificativa: string | null): { motivo: string; detalhe: string } {
  const bruto = (justificativa ?? "").trim();
  if (!bruto) return { motivo: "", detalhe: "" };
  const i = bruto.indexOf(" — ");
  return i < 0
    ? { motivo: bruto, detalhe: "" }
    : { motivo: bruto.slice(0, i), detalhe: bruto.slice(i + 3) };
}

function evidenciasDe(l: LinhaLancamento): Evidencia[] {
  return [...(l.cop_evidencia ?? [])].sort((a, b) => a.posicao - b.posicao);
}

export function PainelLancamentos({
  itens,
  erro,
  compartilhados,
  cadeias,
  ehAdmin,
  fracaoInicial = "todas",
}: {
  itens: LinhaLancamento[];
  erro: string | null;
  compartilhados: { id: string; res: string[]; ocorrencias: number }[];
  cadeias: Record<string, Cadeia>;
  ehAdmin: boolean;
  /** Semeado por `?fracao=` — o atalho "apresentar a planilha da minha Cia".
   *  Só o valor INICIAL: a partir daí o seletor manda, e trocar de fração na
   *  tela não precisa recarregar a página. */
  fracaoInicial?: string;
}) {
  const [excluir, acaoExcluir] = useActionState(excluirLancamentoAction, vazio);
  const [reclass, acaoReclass] = useActionState(reclassificarAction, vazio);
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  const [fMes, setFMes] = useState("todos");
  const [fDe, setFDe] = useState("");
  const [fAte, setFAte] = useState("");
  const [fTurno, setFTurno] = useState("todos");
  const [fFracao, setFFracao] = useState(fracaoInicial);
  const [fOrigem, setFOrigem] = useState("todas");
  const [fAuditou, setFAuditou] = useState("todos");
  const [fFuncao, setFFuncao] = useState("todas");
  const [fSituacao, setFSituacao] = useState("todas");
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState("recentes");

  const filtrados = useMemo(() => {
    const mes = RELATORIOS_MENSAIS.find((m) => m.chave === fMes);
    const termo = busca.trim().toLowerCase();

    const lista = itens.filter((l) => {
      if (mes && (l.data_auditoria < mes.periodo.de || l.data_auditoria > mes.periodo.ate))
        return false;
      // O recorte livre convive com o mês: quem digita as duas datas está
      // olhando um período que não coincide com nenhum fechamento.
      if (fDe && l.data_auditoria < fDe) return false;
      if (fAte && l.data_auditoria > fAte) return false;
      if (fTurno !== "todos" && l.turno !== fTurno) return false;
      if (fFracao !== "todas" && l.subunidade !== fFracao) return false;
      if (fOrigem !== "todas" && l.origem !== fOrigem) return false;
      if (fFuncao !== "todas" && (l.funcao ?? "") !== fFuncao) return false;
      if (fAuditou === "sim" && !l.auditou) return false;
      if (fAuditou === "nao" && l.auditou) return false;
      if (fSituacao === "semids" && l.videos_validos > 0) return false;
      if (fSituacao === "comids" && l.videos_validos === 0) return false;
      if (fSituacao === "pendente" && !l.vinculo_pendente) return false;
      if (fSituacao === "retroativo" && !l.retroativo) return false;
      if (fSituacao === "comparte" && !l.numero_parte) return false;
      if (fSituacao === "comjustificativa" && !l.justificativa) return false;

      if (termo) {
        /* A busca varre o registro inteiro, e não só RE e nome: o superior
           chega aqui com um protocolo do print do policial, com um número de
           parte do documento em papel ou com o identificador que a plataforma
           Motorola mostrou. Procurar em três telas diferentes por isso é o que
           fazia ninguém procurar. */
        const alvo = [
          l.re,
          l.nome_guerra,
          l.posto ?? "",
          l.funcao ?? "",
          l.criado_por_email ?? "",
          l.numero_parte ?? "",
          l.justificativa ?? "",
          protocolo(l.id),
          cadeias[l.unidade_cod ?? ""]?.batalhao ?? "",
          evidenciasDe(l)
            .map((e) => e.bruto)
            .join(" "),
        ]
          .join(" ")
          .toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });

    const porData = (a: LinhaLancamento, b: LinhaLancamento) =>
      `${b.data_auditoria}${b.criado_em}`.localeCompare(`${a.data_auditoria}${a.criado_em}`);

    if (ordem === "antigos") return [...lista].reverse();
    if (ordem === "quantidade")
      return [...lista].sort((a, b) => b.videos_declarados - a.videos_declarados);
    if (ordem === "auditor")
      return [...lista].sort((a, b) => a.nome_guerra.localeCompare(b.nome_guerra, "pt-BR"));
    if (ordem === "data") return [...lista].sort(porData);
    return lista;
  }, [
    itens,
    fMes,
    fDe,
    fAte,
    fTurno,
    fFracao,
    fOrigem,
    fAuditou,
    fFuncao,
    fSituacao,
    busca,
    ordem,
    cadeias,
  ]);

  /* As funções que existem no recorte inteiro, para o seletor. Sai da lista
     carregada, e não de constante: a função é declarada pelo policial e a lista
     cresce sozinha. */
  const funcoes = useMemo(
    () =>
      [...new Set(itens.map((l) => (l.funcao ?? "").trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      ),
    [itens]
  );

  const limpo =
    fMes === "todos" &&
    !fDe &&
    !fAte &&
    fTurno === "todos" &&
    fFracao === "todas" &&
    fOrigem === "todas" &&
    fAuditou === "todos" &&
    fFuncao === "todas" &&
    fSituacao === "todas" &&
    !busca.trim();

  function limpar() {
    setFMes("todos");
    setFDe("");
    setFAte("");
    setFTurno("todos");
    setFFracao("todas");
    setFOrigem("todas");
    setFAuditou("todos");
    setFFuncao("todas");
    setFSituacao("todas");
    setBusca("");
  }

  const declaradas = filtrados.reduce((s, l) => s + l.videos_declarados, 0);
  const auditores = new Set(filtrados.map((l) => l.re)).size;
  const identificadores = filtrados.reduce((s, l) => s + evidenciasDe(l).length, 0);
  const naoAuditaram = filtrados.filter((l) => !l.auditou).length;

  /**
   * CSV do RECORTE, com uma coluna por campo — é o que o Comando cola na
   * apresentação e o que a Corregedoria pede em papel. Sai do que está filtrado
   * na tela, não da base inteira: relatório que não bate com o que a pessoa
   * está vendo é pior que relatório nenhum.
   */
  function exportar() {
    const cab = [
      "Protocolo",
      "Data",
      "Turno",
      "RE",
      "Nome de guerra",
      "Posto",
      "Função",
      "Comando",
      "Batalhão",
      "Fração",
      "Auditou",
      "Quantidade declarada",
      "Identificadores informados",
      "Identificadores reconhecidos",
      "Identificadores",
      "Motivo",
      "Detalhe",
      "Nº da parte",
      "Origem",
      "Conta que enviou",
      "Vínculo pendente",
      "Retroativo",
      "Registrado em",
    ];
    const campo = (v: string | number | boolean) => {
      const s = String(v ?? "");
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const linhas = filtrados.map((l) => {
      const c = cadeias[l.unidade_cod ?? ""];
      const { motivo, detalhe } = partirMotivo(l.justificativa);
      return [
        protocolo(l.id),
        dataBr(l.data_auditoria),
        l.turno,
        l.re,
        l.nome_guerra,
        l.posto ?? "",
        l.funcao ?? "",
        c?.comando ?? "",
        c?.batalhao ?? "",
        c?.fracao ?? ROTULO_SUBUNIDADE[l.subunidade] ?? l.subunidade,
        l.auditou ? "Sim" : "Não",
        l.videos_declarados,
        l.videos_contados,
        l.videos_validos,
        evidenciasDe(l)
          .map((e) => e.bruto)
          .join(" | "),
        motivo,
        detalhe,
        l.numero_parte ?? "",
        l.origem,
        l.criado_por_email ?? "",
        l.vinculo_pendente ? "Sim" : "Não",
        l.retroativo ? "Sim" : "Não",
        carimbo(l.criado_em),
      ].map(campo);
    });

    const csv = [cab.map(campo).join(";"), ...linhas.map((l) => l.join(";"))].join("\n");
    // BOM: sem ele o Excel em português abre "Força Tática" como "ForÃ§a".
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lancamentos-cop-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const estado = excluir.error || excluir.aviso ? excluir : reclass;

  return (
    <div className="mx-auto max-w-[1800px] space-y-5 px-4 py-7 sm:px-6">
      <div>
        <h1 className="font-serif text-xl font-bold uppercase tracking-wide text-branco">
          Planilha de Lançamentos
        </h1>
        <p className="mt-1 max-w-4xl text-[13px] leading-relaxed text-texto-suave">
          Todo lançamento registrado no sistema, campo por campo — planilha importada e formulário
          do portal no mesmo lugar. Toque na linha para abrir o registro completo. A quantidade que
          vale é a <strong className="text-branco">declarada pelo auditor</strong>.
        </p>
      </div>

      {erro && <Faixa tom="erro">{erro}</Faixa>}
      {estado.error && <Faixa tom="erro">{estado.error}</Faixa>}
      {estado.aviso && <Faixa tom="ok">{estado.aviso}</Faixa>}

      {compartilhados.length > 0 && (
        <div className="rounded-xl border border-sinal-atencao/40 bg-sinal-atencao-suave p-4">
          <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-sinal-atencao">
            <AlertTriangle size={15} aria-hidden /> Identificadores em mais de um RE
          </p>
          {/* Relatório, NUNCA bloqueio: dois policiais na mesma ocorrência
              auditam legitimamente a mesma gravação. Acusação injusta é pior
              que fraude não detectada. */}
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-sinal-atencao">
            Isto não é acusação: dois policiais na mesma ocorrência auditam legitimamente a mesma
            gravação. Serve para conferência do Comando.
          </p>
          <ul className="mt-3 space-y-1.5">
            {compartilhados.slice(0, 10).map((c) => (
              <li key={c.id} className="text-[12px] text-sinal-atencao">
                <span className="dados">{c.id.slice(0, 12)}…</span> — {c.ocorrencias} REs:{" "}
                <span className="dados">{c.res.join(", ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ------------------------------------------------------- filtros */}

      <div className="rounded-xl border border-borda bg-tatico-super p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Seletor rotulo="Mês" valor={fMes} ao={setFMes}>
            <option value="todos">Todos</option>
            {RELATORIOS_MENSAIS.map((m) => (
              <option key={m.chave} value={m.chave}>
                {m.rotulo}/{m.ano}
              </option>
            ))}
          </Seletor>

          <Data rotulo="De" valor={fDe} ao={setFDe} />
          <Data rotulo="Até" valor={fAte} ao={setFAte} />

          <Seletor rotulo="Turno" valor={fTurno} ao={setFTurno}>
            <option value="todos">Todos</option>
            {OPCOES_TURNO.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </Seletor>

          <Seletor rotulo="Fração" valor={fFracao} ao={setFFracao}>
            <option value="todas">Todas</option>
            {[...ORDEM_SUBUNIDADES, "outros"].map((f) => (
              <option key={f} value={f}>
                {ROTULO_SUBUNIDADE[f as keyof typeof ROTULO_SUBUNIDADE] ?? f}
              </option>
            ))}
          </Seletor>

          <Seletor rotulo="Auditou?" valor={fAuditou} ao={setFAuditou}>
            <option value="todos">Todos</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </Seletor>

          <Seletor rotulo="Origem" valor={fOrigem} ao={setFOrigem}>
            <option value="todas">Todas</option>
            <option value="planilha">Planilha importada</option>
            <option value="formulario">Formulário do portal</option>
            <option value="admin">Lançado pelo admin</option>
          </Seletor>

          <Seletor rotulo="Função" valor={fFuncao} ao={setFFuncao}>
            <option value="todas">Todas</option>
            {funcoes.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Seletor>

          <Seletor rotulo="Situação" valor={fSituacao} ao={setFSituacao}>
            <option value="todas">Todas</option>
            <option value="comids">Com identificador</option>
            <option value="semids">Sem identificador reconhecido</option>
            <option value="comjustificativa">Com justificativa</option>
            <option value="comparte">Com nº de parte</option>
            <option value="pendente">Vínculo pendente</option>
            <option value="retroativo">Retroativo</option>
          </Seletor>

          <Seletor rotulo="Ordenar por" valor={ordem} ao={setOrdem}>
            <option value="recentes">Registro mais recente</option>
            <option value="antigos">Registro mais antigo</option>
            <option value="data">Data da auditoria</option>
            <option value="quantidade">Maior quantidade</option>
            <option value="auditor">Nome do auditor</option>
          </Seletor>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-texto-suave">
              Busca livre
            </span>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="RE, nome, protocolo, identificador, nº da parte…"
              className="min-w-[280px] rounded-md border border-borda bg-tatico-fundo px-2.5 py-1.5 text-[13px] text-branco placeholder:text-texto-suave/60"
            />
          </label>

          {!limpo && (
            <button
              type="button"
              onClick={limpar}
              className="inline-flex items-center gap-1.5 rounded-md border border-borda px-3 py-1.5 text-[12px] font-semibold text-texto-suave hover:border-vermelho/40 hover:text-vermelho"
            >
              <FilterX size={13} aria-hidden /> Limpar
            </button>
          )}

          <button
            type="button"
            onClick={exportar}
            disabled={filtrados.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-vermelho/40 bg-vermelho/10 px-3 py-1.5 text-[12px] font-bold text-vermelho hover:bg-vermelho/20 disabled:opacity-40"
          >
            <Download size={13} aria-hidden /> Exportar CSV
          </button>
        </div>

        {/* Os quatro números do recorte. O total DECLARADO vem primeiro porque
            é a régua oficial do painel: vê-lo igual aqui e no dashboard é o que
            permite conferir sem abrir o banco. */}
        <div className="mt-4 grid gap-3 border-t border-borda pt-3 sm:grid-cols-2 lg:grid-cols-4">
          <Contador rotulo="Evidências declaradas" valor={declaradas} destaque />
          <Contador rotulo="Lançamentos no recorte" valor={`${filtrados.length} de ${itens.length}`} />
          <Contador rotulo="Auditores distintos" valor={auditores} />
          <Contador
            rotulo="Identificadores informados"
            valor={identificadores}
            nota={naoAuditaram > 0 ? `${naoAuditaram} declararam não auditar` : undefined}
          />
        </div>
      </div>

      {/* -------------------------------------------------------- tabela */}

      <div className="overflow-x-auto rounded-xl border border-borda bg-tatico-super">
        <table className="w-full min-w-[1200px] text-left text-[13px]">
          <thead className="border-b border-borda text-[11px] uppercase tracking-wide text-texto-suave">
            <tr>
              <th className="w-8 px-3 py-3" />
              <th className="px-3 py-3">Protocolo</th>
              <th className="px-3 py-3">Data / turno</th>
              <th className="px-3 py-3">Auditor</th>
              <th className="px-3 py-3">Unidade declarada</th>
              <th className="px-3 py-3 text-center">Auditou</th>
              <th className="px-3 py-3 text-right">Declarado</th>
              <th className="px-3 py-3 text-right">IDs</th>
              <th className="px-3 py-3">Motivo</th>
              <th className="px-3 py-3">Registro</th>
              {ehAdmin && <th className="px-3 py-3">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={ehAdmin ? 11 : 10} className="px-4 py-10 text-center text-texto-suave">
                  {itens.length === 0
                    ? "Nenhum lançamento registrado no banco ainda."
                    : "Nenhum lançamento neste recorte."}
                </td>
              </tr>
            )}

            {filtrados.map((l) => {
              const c = cadeias[l.unidade_cod ?? ""];
              const { motivo, detalhe } = partirMotivo(l.justificativa);
              const evidencias = evidenciasDe(l);
              const expandido = aberto === l.id;

              return (
                /* `Fragment` com chave, e não `<>`: a linha e o detalhe são
                   dois `<tr>` irmãos para o mesmo lançamento, e fragmento curto
                   não aceita `key`. */
                <Fragment key={l.id}>
                  <tr
                    className={`border-b border-borda/60 align-top ${
                      expandido ? "bg-vermelho/5" : ""
                    }`}
                  >
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setAberto(expandido ? null : l.id)}
                        aria-expanded={expandido}
                        aria-label={expandido ? "Fechar detalhe" : "Abrir detalhe"}
                        className="flex h-7 w-7 items-center justify-center rounded border border-borda text-texto-suave hover:border-vermelho/40 hover:text-vermelho"
                      >
                        <ChevronDown
                          size={14}
                          className={expandido ? "rotate-180 transition-transform" : "transition-transform"}
                          aria-hidden
                        />
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <span className="dados text-[12px] text-branco">{protocolo(l.id)}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="dados">{dataBr(l.data_auditoria)}</span>
                      <span className="block text-[11.5px] text-texto-suave">{l.turno}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="dados">{l.re}</span>
                      <span className="block text-[11.5px] text-texto-suave">
                        {[l.posto, l.nome_guerra].filter(Boolean).join(" ")}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[12.5px] font-semibold text-branco">
                        {c?.fracao ?? ROTULO_SUBUNIDADE[l.subunidade] ?? l.subunidade}
                      </span>
                      <span className="block text-[11px] text-texto-suave">
                        {c ? `${c.comando} · ${c.batalhao}` : "16º BPM/M"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {l.auditou ? (
                        <Selo tom="ok">Sim</Selo>
                      ) : (
                        <Selo tom="neutro">Não</Selo>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="dados-destaque text-[15px]">{l.videos_declarados}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="dados">{evidencias.length}</span>
                      <span className="block text-[11px] text-texto-suave">
                        {l.videos_validos} reconhec.
                      </span>
                    </td>
                    <td className="max-w-[220px] px-3 py-3">
                      <span className="block truncate text-[12px] text-texto-suave" title={motivo}>
                        {motivo || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[11.5px] text-texto-suave">
                      <span className="dados block">{carimbo(l.criado_em)}</span>
                      {l.origem !== "formulario" && <Selo tom="neutro">{l.origem}</Selo>}
                      {l.vinculo_pendente && <Selo tom="atencao">Vínculo pendente</Selo>}
                      {l.retroativo && <Selo tom="atencao">Retroativo</Selo>}
                    </td>

                    {ehAdmin && (
                      <td className="px-3 py-3">
                        {abrindo === l.id ? (
                          <form action={acaoExcluir} className="flex flex-col gap-1.5">
                            <input type="hidden" name="id" value={l.id} />
                            <input
                              name="motivo"
                              placeholder="Motivo da exclusão"
                              required
                              minLength={5}
                              className="min-h-9 w-44 rounded border border-borda bg-transparent px-2 py-1 text-[12px] text-branco"
                            />
                            <div className="flex gap-1.5">
                              <button
                                type="submit"
                                className="rounded border border-sinal-critico/50 px-2 py-1 text-[11px] font-bold text-sinal-critico"
                              >
                                Excluir
                              </button>
                              <button
                                type="button"
                                onClick={() => setAbrindo(null)}
                                className="rounded border border-borda px-2 py-1 text-[11px] font-bold text-texto-suave"
                              >
                                Cancelar
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAbrindo(l.id)}
                            className="inline-flex items-center gap-1 rounded border border-borda px-2 py-1.5 text-[11.5px] font-bold text-texto-suave hover:border-sinal-critico/50 hover:text-sinal-critico"
                          >
                            <Trash2 size={12} aria-hidden /> Excluir
                          </button>
                        )}
                      </td>
                    )}
                  </tr>

                  {expandido && (
                    <tr className="border-b border-borda bg-tatico-fundo/40">
                      <td colSpan={ehAdmin ? 11 : 10} className="px-6 py-5">
                        <div className="grid gap-6 lg:grid-cols-3">
                          <Bloco titulo="Quem lançou">
                            <Linha rotulo="RE" valor={l.re} dados />
                            <Linha rotulo="Nome de guerra" valor={l.nome_guerra} />
                            <Linha rotulo="Posto / graduação" valor={l.posto} />
                            <Linha rotulo="Função declarada" valor={l.funcao} />
                            <Linha rotulo="Comando" valor={c?.comando} />
                            <Linha rotulo="Batalhão" valor={c?.batalhao ?? "16º BPM/M"} />
                            <Linha
                              rotulo="Fração"
                              valor={c?.fracao ?? ROTULO_SUBUNIDADE[l.subunidade] ?? l.subunidade}
                            />
                            <Linha rotulo="Conta que enviou" valor={l.criado_por_email} />
                          </Bloco>

                          <Bloco titulo="O que foi declarado">
                            <Linha rotulo="Data da auditoria" valor={dataBr(l.data_auditoria)} dados />
                            <Linha rotulo="Turno" valor={l.turno} />
                            <Linha rotulo="Hora informada" valor={l.hora} />
                            <Linha rotulo="Auditou no turno" valor={l.auditou ? "Sim" : "Não"} />
                            <Linha
                              rotulo="Quantidade declarada"
                              valor={String(l.videos_declarados)}
                              dados
                            />
                            <Linha
                              rotulo="Digitada no formulário"
                              valor={
                                l.payload_bruto?.quantidadeDeclarada
                                  ? String(l.payload_bruto.quantidadeDeclarada)
                                  : "— (valeu a contagem de identificadores)"
                              }
                            />
                            <Linha rotulo="Motivo" valor={motivo} />
                            <Linha rotulo="Detalhe" valor={detalhe} />
                            <Linha rotulo="Nº da parte" valor={l.numero_parte} />
                          </Bloco>

                          <Bloco titulo={`Identificadores (${evidencias.length})`}>
                            {evidencias.length === 0 ? (
                              <p className="text-[12.5px] text-texto-suave">
                                Nenhum identificador informado. A evidência conta normalmente — o
                                que não existe é o caminho para reabrir a gravação depois.
                              </p>
                            ) : (
                              <ul className="space-y-1">
                                {evidencias.map((e) => (
                                  <li
                                    key={`${l.id}-${e.posicao}`}
                                    className="flex items-baseline gap-2 text-[12px]"
                                  >
                                    <span className="w-5 shrink-0 text-texto-suave">
                                      {e.posicao}.
                                    </span>
                                    <span
                                      className={`dados break-all ${
                                        e.descartada ? "text-texto-suave line-through" : "text-branco"
                                      }`}
                                    >
                                      {e.bruto}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}

                            {(l.payload_bruto?.recusas?.length ?? 0) > 0 && (
                              <div className="mt-3 border-t border-borda pt-3">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-texto-suave">
                                  Informado e não reconhecido pelo sistema
                                </p>
                                {/* Sem tom de acusação, de propósito: a decisão
                                    de 07/09/2026 é que o identificador não
                                    reprova ninguém. Isto aqui é o caminho da
                                    correção, não uma falta. */}
                                <ul className="mt-1.5 space-y-1">
                                  {l.payload_bruto!.recusas!.map((r, i) => (
                                    <li key={`${l.id}-r${i}`} className="text-[12px] text-texto-suave">
                                      <span className="dados break-all">{r.bruto}</span>{" "}
                                      <span className="opacity-70">({r.motivo})</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {ehAdmin && (
                              <form
                                action={acaoReclass}
                                className="mt-4 flex flex-wrap items-end gap-2 border-t border-borda pt-3"
                              >
                                <input type="hidden" name="id" value={l.id} />
                                <label className="flex flex-col gap-1">
                                  <span className="text-[11px] font-bold uppercase tracking-wide text-texto-suave">
                                    Reclassificar fração
                                  </span>
                                  <select
                                    name="subunidade"
                                    defaultValue={l.subunidade}
                                    className="min-h-9 rounded border border-borda bg-transparent px-2 py-1 text-[12px] text-branco"
                                  >
                                    {[...ORDEM_SUBUNIDADES, "outros"].map((s) => (
                                      <option key={s} value={s}>
                                        {ROTULO_SUBUNIDADE[s] ?? s}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <button
                                  type="submit"
                                  className="min-h-9 rounded border border-borda px-3 py-1 text-[11.5px] font-bold text-texto-suave hover:border-vermelho/40 hover:text-vermelho"
                                >
                                  Salvar
                                </button>
                              </form>
                            )}
                          </Bloco>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[12px] leading-relaxed text-texto-suave">
        Identificadores informados pelo próprio auditor. O Portal registra a declaração e o momento
        em que ela foi feita; não confirma, por si, a existência da mídia na plataforma nem a
        realização da auditoria.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ auxiliares */

function Faixa({ tom, children }: { tom: "erro" | "ok"; children: React.ReactNode }) {
  const cor =
    tom === "erro"
      ? "border-sinal-critico/40 bg-sinal-critico-suave text-sinal-critico"
      : "border-sinal-conforme/40 bg-sinal-conforme-suave text-sinal-conforme";
  return (
    <p className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-[13px] ${cor}`}>
      {tom === "erro" ? (
        <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
      ) : (
        <Check size={15} className="mt-0.5 shrink-0" aria-hidden />
      )}
      {children}
    </p>
  );
}

function Selo({ tom, children }: { tom: "neutro" | "atencao" | "ok"; children: React.ReactNode }) {
  const cor =
    tom === "atencao"
      ? "border-sinal-atencao/40 text-sinal-atencao"
      : tom === "ok"
        ? "border-sinal-conforme/40 text-sinal-conforme"
        : "border-borda text-texto-suave";
  return (
    <span className={`mr-1 inline-block rounded border px-1.5 py-0.5 text-[11px] ${cor}`}>
      {children}
    </span>
  );
}

function Contador({
  rotulo,
  valor,
  nota,
  destaque = false,
}: {
  rotulo: string;
  valor: string | number;
  nota?: string;
  destaque?: boolean;
}) {
  return (
    <div className="rounded-lg border border-borda bg-tatico-fundo/40 px-3 py-2.5">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-texto-suave">
        {rotulo}
      </p>
      <p className={`mt-0.5 ${destaque ? "dados-destaque text-[20px]" : "dados text-[17px]"}`}>
        {valor}
      </p>
      {nota && <p className="text-[11px] text-texto-suave">{nota}</p>}
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-borda bg-tatico-super p-4">
      <h3 className="mb-2 border-b border-borda pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-vermelho">
        {titulo}
      </h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function Linha({
  rotulo,
  valor,
  dados = false,
}: {
  rotulo: string;
  valor?: string | null;
  dados?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-borda/50 py-1 last:border-0">
      <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-texto-suave">
        {rotulo}
      </span>
      <span
        className={`min-w-0 flex-1 break-words text-right text-[12.5px] text-branco ${
          dados ? "dados" : ""
        }`}
      >
        {valor?.toString().trim() || "—"}
      </span>
    </div>
  );
}

/** Select rotulado da barra de filtros. Existe para as caixas não divergirem em
 *  altura e espaçamento — a barra fica logo acima da tabela e desalinhamento
 *  ali salta aos olhos. */
function Seletor({
  rotulo,
  valor,
  ao,
  children,
}: {
  rotulo: string;
  valor: string;
  ao: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wide text-texto-suave">
        {rotulo}
      </span>
      <select
        value={valor}
        onChange={(e) => ao(e.target.value)}
        className="min-h-9 rounded-md border border-borda bg-tatico-fundo px-2.5 py-1.5 text-[13px] text-branco"
      >
        {children}
      </select>
    </label>
  );
}

function Data({
  rotulo,
  valor,
  ao,
}: {
  rotulo: string;
  valor: string;
  ao: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wide text-texto-suave">
        {rotulo}
      </span>
      <input
        type="date"
        value={valor}
        onChange={(e) => ao(e.target.value)}
        className="min-h-9 rounded-md border border-borda bg-tatico-fundo px-2.5 py-1.5 text-[13px] text-branco"
      />
    </label>
  );
}
