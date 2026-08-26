"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Swords,
  Users,
  ShieldAlert,
  ClipboardList,
  Package,
  Megaphone,
  Scale,
  Truck,
  Crosshair,
  ClipboardCheck,
  Video,
  ExternalLink,
  Lock,
  CircleAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPinOff,
  FileWarning,
  type LucideIcon,
} from "lucide-react";
import { Card, Badge } from "@/components/command/ui";
import type {
  FonteInventario,
  IconeFonte,
  ItemInventario,
  ResumoFonte,
} from "@/lib/inventario-2026";
import { urlPlanilha, urlVisor } from "@/lib/inventario-2026";

const ICONES: Record<IconeFonte, LucideIcon> = {
  "estado-maior": Building2,
  companhia: Building2,
  "forca-tatica": Swords,
  pessoal: Users,
  inteligencia: ShieldAlert,
  operacoes: ClipboardList,
  logistica: Package,
  comunicacao: Megaphone,
  justica: Scale,
  frota: Truck,
  armamento: Crosshair,
  ordenanca: ClipboardCheck,
  auditoria: Video,
};

/** Ícone de cada cartão de indicador, resolvido aqui dentro por chave.
 *  page.tsx é Server Component: não dá pra passar o componente do ícone
 *  (uma função) direto como prop pra um Client Component — só um nome. */
const ICONES_INDICADOR = {
  itens: Package,
  confere: CheckCircle2,
  divergente: AlertTriangle,
  espera: Clock,
  perdido: MapPinOff,
  descarga: Truck,
  cofim: FileWarning,
} as const;

export type EstadoFonte = {
  chave: string;
  ok: boolean;
  erro?: string;
  resumo?: ResumoFonte;
};

/**
 * Cartão de atalho no padrão visual da intranet PMESP: superfície branca,
 * ícone de traço em vermelho e rótulo em negrito embaixo. O cartão também é
 * o seletor do visor — clicar troca a planilha exibida acima, sem recarregar
 * a página (o iframe do Google é o único que refaz requisição).
 */
function CartaoFonte({
  fonte,
  estado,
  ativo,
  onSelecionar,
}: {
  fonte: FonteInventario;
  estado?: EstadoFonte;
  ativo: boolean;
  onSelecionar: () => void;
}) {
  const Icone = ICONES[fonte.icone];
  const semAcesso = estado && !estado.ok;
  const total = estado?.resumo?.total ?? 0;
  const divergente = estado?.resumo?.divergente ?? 0;

  return (
    <button
      type="button"
      onClick={onSelecionar}
      aria-pressed={ativo}
      className={`group flex h-full flex-col items-center justify-start gap-3 rounded-2xl border bg-tatico-super px-3 py-5 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        ativo
          ? "border-vermelho ring-2 ring-vermelho/30"
          : "border-branco/10 hover:border-vermelho/40"
      }`}
    >
      <Icone
        size={44}
        strokeWidth={1.5}
        className={`transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-3 ${
          semAcesso ? "text-branco/25" : "text-vermelho"
        }`}
        aria-hidden
      />
      <span className="text-[13px] font-bold leading-tight text-branco">{fonte.titulo}</span>

      {semAcesso ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-branco/40">
          <Lock size={10} /> sem acesso
        </span>
      ) : fonte.foraDoInventario ? (
        <span className="text-[10px] uppercase tracking-wide text-branco/40">controle à parte</span>
      ) : total === 0 ? (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-branco/40">
          sem lançamento
        </span>
      ) : (
        <span className="text-[10px] uppercase tracking-wide text-branco/45">
          {total} {total === 1 ? "item" : "itens"}
          {divergente > 0 && (
            <span className="ml-1 font-bold text-vermelho">{divergente} div.</span>
          )}
        </span>
      )}
    </button>
  );
}

/** Conta de 0 até o valor final ao montar — pequeno respiro de movimento nos
 *  cartões de indicador, sem exagero (para quem prefere menos animação, o
 *  navegador já cuida disso via prefers-reduced-motion). */
function useContagem(alvo: number, duracaoMs = 700) {
  const [valor, setValor] = useState(0);

  useEffect(() => {
    const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let quadro: number;

    // setValor sempre dentro de um callback de rAF, nunca direto no corpo do
    // efeito — mesmo o caso "pula direto pro valor final" passa por um
    // quadro, pra não disparar setState síncrono dentro do efeito.
    if (reduzirMovimento || alvo === 0) {
      quadro = requestAnimationFrame(() => setValor(alvo));
      return () => cancelAnimationFrame(quadro);
    }

    const inicio = performance.now();
    const passo = (agora: number) => {
      const progresso = Math.min(1, (agora - inicio) / duracaoMs);
      const suavizado = 1 - (1 - progresso) ** 3; // ease-out cúbico
      setValor(Math.round(alvo * suavizado));
      if (progresso < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [alvo, duracaoMs]);

  return valor;
}

function Indicador({
  rotulo,
  valor,
  destaque,
  icone,
}: {
  rotulo: string;
  valor: number;
  destaque?: boolean;
  icone?: keyof typeof ICONES_INDICADOR;
}) {
  const contado = useContagem(valor);
  const ativo = destaque && valor > 0;
  const Icone = icone ? ICONES_INDICADOR[icone] : undefined;

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-vermelho/30 hover:shadow-lg hover:shadow-vermelho/5">
      {Icone && (
        <Icone
          size={16}
          strokeWidth={2}
          className={`mb-2 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-6 ${
            ativo ? "text-vermelho" : "text-branco/35"
          }`}
          aria-hidden
        />
      )}
      <p
        className={`tabular-nums text-3xl font-extrabold tracking-tight ${
          ativo ? "text-vermelho" : "text-branco"
        }`}
      >
        {contado}
      </p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-branco/50">
        {rotulo}
      </p>
    </Card>
  );
}

function Tabela({
  titulo,
  descricao,
  itens,
  colunas,
  vazio,
}: {
  titulo: string;
  descricao: string;
  itens: ItemInventario[];
  colunas: { rotulo: string; campo: keyof ItemInventario; largura?: string }[];
  vazio: string;
}) {
  const [fonteFiltro, setFonteFiltro] = useState("");
  const fontes = useMemo(
    () => [...new Set(itens.map((i) => i.fonteTitulo))].sort(),
    [itens]
  );
  const visiveis = fonteFiltro ? itens.filter((i) => i.fonteTitulo === fonteFiltro) : itens;

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-branco">{titulo}</h2>
          <p className="mt-0.5 max-w-2xl text-xs text-branco/50">{descricao}</p>
        </div>
        {fontes.length > 1 && (
          <select
            value={fonteFiltro}
            onChange={(e) => setFonteFiltro(e.target.value)}
            aria-label={`Filtrar ${titulo} por fonte`}
            className="rounded-lg border border-branco/15 bg-tatico-super px-3 py-1.5 text-xs font-medium text-branco"
          >
            <option value="">Todas as fontes ({itens.length})</option>
            {fontes.map((f) => (
              <option key={f} value={f}>
                {f} ({itens.filter((i) => i.fonteTitulo === f).length})
              </option>
            ))}
          </select>
        )}
      </div>

      {visiveis.length === 0 ? (
        <div className="rounded-xl border border-dashed border-branco/15 px-6 py-10 text-center text-xs text-branco/45">
          {vazio}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-branco/10 bg-tatico-super">
          <table className="w-full min-w-[52rem] text-left text-xs">
            <thead className="border-b border-branco/10 text-[10px] uppercase tracking-wide text-branco/45">
              <tr>
                <th className="px-3 py-2 font-semibold">Fonte</th>
                {colunas.map((c) => (
                  <th key={c.campo} className={`px-3 py-2 font-semibold ${c.largura ?? ""}`}>
                    {c.rotulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visiveis.map((item, i) => (
                <tr
                  key={`${item.fonte}-${item.patrimonio}-${i}`}
                  className="border-b border-branco/5 last:border-0 hover:bg-branco/[0.03]"
                >
                  <td className="whitespace-nowrap px-3 py-2 font-semibold text-branco/70">
                    {item.fonteTitulo}
                  </td>
                  {colunas.map((c) => (
                    <td key={c.campo} className="px-3 py-2 text-branco/70">
                      {item[c.campo] || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function InventarioCentral({
  fontes,
  estados,
  divergencias,
  descargas,
}: {
  fontes: FonteInventario[];
  estados: EstadoFonte[];
  divergencias: ItemInventario[];
  descargas: ItemInventario[];
}) {
  // Abre já exibindo a planilha com mais itens lançados: é a que tem algo a
  // mostrar. Cair numa planilha ainda em branco daria a impressão de que a
  // página não carregou.
  const inicial = useMemo(() => {
    const comDados = [...estados]
      .filter((e) => e.ok && (e.resumo?.total ?? 0) > 0)
      .sort((a, b) => (b.resumo?.total ?? 0) - (a.resumo?.total ?? 0))[0];
    return comDados?.chave ?? fontes[0].chave;
  }, [estados, fontes]);

  const [selecionada, setSelecionada] = useState(inicial);
  const fonte = fontes.find((f) => f.chave === selecionada) ?? fontes[0];
  const estado = estados.find((e) => e.chave === fonte.chave);
  const grupos = [...new Set(fontes.map((f) => f.grupo))];

  return (
    <>
      {/* Visor: a planilha já vem exibida ao abrir a página. */}
      <section className="overflow-hidden rounded-2xl border border-branco/10 bg-tatico-super shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-branco/10 px-4 py-3">
          <div className="flex items-center gap-3">
            {(() => {
              const Icone = ICONES[fonte.icone];
              return <Icone size={22} strokeWidth={1.75} className="text-vermelho" aria-hidden />;
            })()}
            <div>
              <p className="text-sm font-extrabold text-branco">{fonte.titulo}</p>
              <p className="text-[11px] text-branco/45">
                Preenchimento: {fonte.responsavel}
                {estado?.resumo && estado.resumo.total > 0
                  ? ` · ${estado.resumo.total} itens lançados`
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {estado && !estado.ok && (
              <Badge tone="critical">
                <Lock size={11} /> sem acesso
              </Badge>
            )}
            {estado?.resumo && estado.resumo.divergente > 0 && (
              <Badge tone="critical">{estado.resumo.divergente} divergentes</Badge>
            )}
            {estado?.ok && estado.resumo?.total === 0 && !fonte.foraDoInventario && (
              <Badge tone="attention">aguardando preenchimento</Badge>
            )}
            <a
              href={urlPlanilha(fonte)}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 rounded-lg bg-vermelho px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
            >
              Abrir no Google Sheets{" "}
              <ExternalLink
                size={13}
                className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </a>
          </div>
        </div>

        {fonte.nota && (
          <p className="flex items-start gap-2 border-b border-branco/10 bg-branco/[0.03] px-4 py-2.5 text-[11px] text-branco/55">
            <CircleAlert size={13} className="mt-px shrink-0 text-vermelho" aria-hidden />
            <span>{fonte.nota}</span>
          </p>
        )}

        <iframe
          key={fonte.chave}
          src={urlVisor(fonte)}
          title={`Planilha ${fonte.titulo}`}
          className="h-[30rem] w-full border-0 bg-white"
          loading="lazy"
        />
      </section>

      {/* Atalhos: mesma linguagem visual dos cartões da intranet PMESP. */}
      {grupos.map((grupo) => (
        <section key={grupo} className="mt-8">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-branco/45">
            {grupo}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {fontes
              .filter((f) => f.grupo === grupo)
              .map((f) => (
                <CartaoFonte
                  key={f.chave}
                  fonte={f}
                  estado={estados.find((e) => e.chave === f.chave)}
                  ativo={f.chave === selecionada}
                  onSelecionar={() => setSelecionada(f.chave)}
                />
              ))}
          </div>
        </section>
      ))}

      <Tabela
        titulo="Quadro de divergências"
        descricao="Itens em que o LCM contábil não bate com o físico, ou que não foram localizados. É a lista de trabalho do levantamento."
        itens={divergencias}
        vazio="Nenhuma divergência lançada até agora nas planilhas lidas."
        colunas={[
          { rotulo: "Material", campo: "descricao" },
          { rotulo: "Patrimônio", campo: "patrimonio" },
          { rotulo: "Local no LCM", campo: "localLcm" },
          { rotulo: "Local físico", campo: "localFisico" },
          { rotulo: "Providência", campo: "providencia" },
          { rotulo: "Situação", campo: "situacao" },
        ]}
      />

      <Tabela
        titulo="Quadro de descarga e exclusão de LCM"
        descricao="Bens já entregues ou em processo de descarga pelo P4, pelo FUSSESP ou pela DL, e os que aguardam exclusão da carga contábil."
        itens={descargas}
        vazio="Nenhum item em processo de descarga lançado até agora."
        colunas={[
          { rotulo: "Material", campo: "descricao" },
          { rotulo: "Patrimônio", campo: "patrimonio" },
          { rotulo: "Fase da administração", campo: "fase" },
          { rotulo: "Detalhe", campo: "detalhe" },
          { rotulo: "COFIM", campo: "cofim" },
        ]}
      />
    </>
  );
}

export { Indicador };
