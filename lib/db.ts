import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/preview";

/**
 * Camada de leitura server-side. Como o acesso é gated pelo login simples
 * (sem sessão Supabase), as consultas usam o service client — sempre no
 * servidor, nunca exposto ao cliente. Toda função degrada para vazio se o
 * banco não estiver configurado, ou se a consulta falhar (erro sempre
 * logado — ver safe()/unwrap() abaixo).
 */
function db() {
  return createAdminClient();
}

async function safe<T>(fn: () => Promise<T>, fallback: T, label?: string): Promise<T> {
  if (!supabaseConfigurado()) return fallback;
  try {
    return await fn();
  } catch (erro) {
    console.error(`[db]${label ? ` ${label}` : ""} falha na consulta, usando fallback:`, erro);
    return fallback;
  }
}

/**
 * O supabase-js v2 não lança em erro de query (postgrest-js tem
 * shouldThrowOnError=false por padrão) — devolve { data: null, error }.
 * Destructurar só `{ data }` (como o código fazia antes) descarta o erro
 * silenciosamente, uma camada ANTES do catch de safe(). unwrap() promove o
 * erro a exceção para que safe() o capture e logue.
 */
function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T | null {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

function hojeBrt(): string {
  // en-CA formata como YYYY-MM-DD. Evita o bug de usar toISOString() (UTC):
  // à noite em horário de Brasília, UTC já é o dia seguinte.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/** Timestamp mais recente entre todas as fontes monitoradas — alimenta o
 * rodapé global da Sala de Comando ("dados atualizados há X"). */
export function getUltimaAtualizacao() {
  return safe(
    async () => {
      const data = unwrap(
        await db()
          .from("source_freshness")
          .select("last_update_at")
          .not("last_update_at", "is", null)
          .order("last_update_at", { ascending: false })
          .limit(1)
      );
      return data?.[0]?.last_update_at ?? null;
    },
    null as string | null,
    "getUltimaAtualizacao"
  );
}

export function getFontes() {
  return safe(
    async () => {
      const data = unwrap(await db().from("source_freshness").select("*").order("categoria"));
      return data ?? [];
    },
    [] as any[],
    "getFontes"
  );
}

export function getAlertRules() {
  return safe(
    async () => {
      const data = unwrap(await db().from("alert_rules").select("*").order("nivel"));
      return data ?? [];
    },
    [] as any[],
    "getAlertRules"
  );
}

export function getViaturasMapa() {
  return safe(
    async () => {
      const data = unwrap(
        await db()
          .from("viaturas")
          .select("id, prefixo, situacao, viatura_posicoes(lat, lng, registrado_em)")
          .eq("ativo", true)
          // Só a posição mais recente por viatura — antes trazia o histórico
          // inteiro (sem limite) e ordenava em JS; cresce sem teto conforme
          // o coletor de posições grava.
          .order("registrado_em", { referencedTable: "viatura_posicoes", ascending: false })
          .limit(1, { referencedTable: "viatura_posicoes" })
      );
      return (data ?? [])
        .map((v: any) => {
          const pos = (v.viatura_posicoes ?? [])[0];
          return pos
            ? { id: v.id, prefixo: v.prefixo, situacao: v.situacao, lat: pos.lat, lng: pos.lng }
            : null;
        })
        .filter(Boolean);
    },
    [] as any[],
    "getViaturasMapa"
  );
}

export function getCamerasMapa() {
  return safe(
    async () => {
      const data = unwrap(
        await db()
          .from("cameras")
          .select("id, identificacao, lat, lng, tem_ocr")
          .not("lat", "is", null)
          .neq("status", "recusada")
      );
      return data ?? [];
    },
    [] as any[],
    "getCamerasMapa"
  );
}

export function getOcorrenciasMapa() {
  return safe(
    async () => {
      const data = unwrap(
        await db()
          .from("ocorrencias")
          .select("id, lat, lng")
          .not("lat", "is", null)
          .in("status", ["aberta", "em_despacho", "em_atendimento"])
      );
      return (data ?? []).map((o: any) => ({ id: o.id, lat: o.lat, lng: o.lng, peso: 1 }));
    },
    [] as any[],
    "getOcorrenciasMapa"
  );
}

export function getCameras() {
  return safe(
    async () => {
      const data = unwrap(
        await db().from("cameras").select("*").order("created_at", { ascending: false })
      );
      return data ?? [];
    },
    [] as any[],
    "getCameras"
  );
}

export function getOperacoesEspeciais() {
  return safe(
    async () => {
      const data = unwrap(
        await db()
          .from("operacoes_especiais")
          .select("*")
          .in("status", ["planejada", "ativa"])
          .order("inicio")
      );
      return data ?? [];
    },
    [] as any[],
    "getOperacoesEspeciais"
  );
}

export function getAlertasPlaca() {
  return safe(
    async () => {
      const data = unwrap(
        await db()
          .from("alertas_placa")
          .select("*")
          .eq("status", "pendente")
          .order("detectado_em", { ascending: false })
      );
      return data ?? [];
    },
    [] as any[],
    "getAlertasPlaca"
  );
}

export function getOcorrenciasAbertas() {
  return safe(
    async () => {
      const data = unwrap(
        await db()
          .from("ocorrencias")
          .select("*")
          .in("status", ["aberta", "em_despacho"])
          .order("detectado_em", { ascending: false })
      );
      return data ?? [];
    },
    [] as any[],
    "getOcorrenciasAbertas"
  );
}

export function getReservaArmas() {
  return safe(
    async () => {
      const data = unwrap(await db().from("reserva_armas").select("*").order("categoria"));
      return data ?? [];
    },
    [] as any[],
    "getReservaArmas"
  );
}

export function getReservaArmasCriticas() {
  return safe(
    async () => {
      const data = unwrap(
        await db()
          .from("reserva_armas_criticas")
          .select("*")
          .order("categoria")
          .order("situacao")
      );
      return data ?? [];
    },
    [] as any[],
    "getReservaArmasCriticas"
  );
}

export function getFrota() {
  return safe(
    async () => {
      const data = unwrap(
        await db()
          .from("viaturas")
          .select("id, prefixo, tipo, cia_id, situacao")
          .eq("ativo", true)
          .order("prefixo")
      );
      return data ?? [];
    },
    [] as any[],
    "getFrota"
  );
}

/**
 * Motomec — dados operacionais demonstrativos além da frota (migration 009 /
 * ingest/secoes/motomec_operacional.py): abastecimento, empenhos, acidentes,
 * descarga (baixa) e remanejamento de viaturas.
 */
export function getMotomecOperacional() {
  return safe(
    async () => {
      const c = db();

      // O projeto Supabase tem "max rows" = 1000 no PostgREST (config de API,
      // não contornável só com .range() maior) — pagina em blocos de 1000
      // até esgotar, porque hoje já são ~7,2k transações de abastecimento
      // (jan-jul/2026, todas as Cias + FT/EM — ver
      // ingest/secoes/motomec_operacional.py).
      async function buscarTudo(tabela: string, colunas: string) {
        const linhas: any[] = [];
        let de = 0;
        const TAMANHO = 1000;
        for (;;) {
          const { data, error } = await c.from(tabela).select(colunas).range(de, de + TAMANHO - 1);
          if (error) throw new Error(error.message);
          linhas.push(...(data ?? []));
          if (!data || data.length < TAMANHO) break;
          de += TAMANHO;
        }
        return linhas;
      }

      const [abastData, empenhos, acidentes, descarga, remanejamento] = await Promise.all([
        buscarTudo("motomec_abastecimento", "valor_total, quantidade, produto, prefixo, data_abastecimento"),
        c
          .from("motomec_empenhos")
          .select("marca, modelo, prefixo, valor_total, data_orcamento", { count: "exact" })
          .order("data_orcamento", { ascending: false })
          .limit(5),
        c
          .from("motomec_acidentes")
          .select("unidade, sindicancia, data_acidente, lesao_pm", { count: "exact" })
          .order("data_acidente", { ascending: false })
          .limit(6),
        c.from("motomec_descarga").select("fase", { count: "exact" }),
        c.from("motomec_remanejamento").select("situacao"),
      ]);

      const totalCombustivelReais = abastData.reduce((s: number, r: any) => s + (Number(r.valor_total) || 0), 0);
      const totalLitros = abastData
        .filter((r: any) => (r.produto || "").toUpperCase().includes("GASOLINA") || (r.produto || "").toUpperCase().includes("ETANOL") || (r.produto || "").toUpperCase().includes("DIESEL"))
        .reduce((s: number, r: any) => s + (Number(r.quantidade) || 0), 0);
      const viaturasAbastecidas = new Set(abastData.map((r: any) => r.prefixo).filter(Boolean)).size;

      // Janela real coberta pelas transações carregadas — calculada a partir
      // do próprio dado (nunca hardcoded), porque a cobertura muda conforme
      // a ingestão avança (hoje jan-jul/2026; a fonte "Relatório_Analise"
      // cobre só jun-jul, a fonte "CONFERÊNCIA" cobre jan-mai — ver
      // ingest/secoes/motomec_operacional.py). Descarta datas fora de
      // 2026 (há 2 typos de digitação na planilha-fonte, ex.: um "2025" e
      // um "06" no lugar de "04" — ver relatório da ingestão) só para não
      // distorcer a janela exibida; as linhas continuam no banco intactas.
      const datasValidas = abastData
        .map((r: any) => r.data_abastecimento as string | null)
        .filter((d): d is string => !!d && d.startsWith("2026"))
        .sort();
      const periodoInicio = datasValidas[0] ?? null;
      const periodoFim = datasValidas[datasValidas.length - 1] ?? null;

      const descargaData = unwrap(descarga) ?? [];
      const descargaEmAndamento = descargaData.filter((r: any) => r.fase === "em_andamento").length;
      const descargaFinalizada = descargaData.filter((r: any) => r.fase === "finalizada").length;

      const remanejamentoData = unwrap(remanejamento) ?? [];
      const remanejamentoPendente = remanejamentoData.filter((r: any) =>
        (r.situacao || "").toUpperCase().includes("SUSPENDER")
      ).length;

      return {
        abastecimento: {
          transacoes: abastData.length,
          totalReais: totalCombustivelReais,
          totalLitros,
          viaturas: viaturasAbastecidas,
          periodoInicio,
          periodoFim,
        },
        empenhos: unwrap(empenhos) ?? [],
        empenhosTotal: empenhos.count ?? 0,
        acidentes: unwrap(acidentes) ?? [],
        acidentesTotal: acidentes.count ?? 0,
        descarga: { total: descargaData.length, emAndamento: descargaEmAndamento, finalizada: descargaFinalizada },
        remanejamento: { total: remanejamentoData.length, pendente: remanejamentoPendente },
      };
    },
    {
      abastecimento: { transacoes: 0, totalReais: 0, totalLitros: 0, viaturas: 0, periodoInicio: null as string | null, periodoFim: null as string | null },
      empenhos: [] as any[],
      empenhosTotal: 0,
      acidentes: [] as any[],
      acidentesTotal: 0,
      descarga: { total: 0, emAndamento: 0, finalizada: 0 },
      remanejamento: { total: 0, pendente: 0 },
    },
    "getMotomecOperacional"
  );
}

export function getSetores() {
  return safe(
    async () => {
      const data = unwrap(
        await db().from("cpp_setores").select("*").eq("ativo", true).order("cia_id")
      );
      return data ?? [];
    },
    [] as any[],
    "getSetores"
  );
}

export function getAuditEvents(limit = 30) {
  return safe(
    async () => {
      const data = unwrap(
        await db()
          .from("audit_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit)
      );
      return data ?? [];
    },
    [] as any[],
    "getAuditEvents"
  );
}

export function getLogisticsSummary() {
  return safe(
    async () => {
      const c = db();
      const [lsm, descarga, inventario] = await Promise.all([
        c.from("logistics_lsm_entries").select("id, status", { count: "exact" }),
        c.from("logistics_discharge_cases").select("id, status", { count: "exact" }),
        c.from("logistics_inventory_campaigns").select("id, status", { count: "exact" }),
      ]);
      const lsmData = unwrap(lsm) ?? [];
      const descargaData = unwrap(descarga) ?? [];
      const inventarioData = unwrap(inventario) ?? [];
      return {
        lsmTotal: lsm.count ?? 0,
        lsmAbertas: lsmData.filter((r: any) => !["fulfilled", "cancelled"].includes(r.status)).length,
        descargaTotal: descarga.count ?? 0,
        descargaEmAndamento: descargaData.filter((r: any) => !["completed", "rejected"].includes(r.status)).length,
        inventarioTotal: inventario.count ?? 0,
        inventarioAbertos: inventarioData.filter((r: any) => r.status !== "concluded").length,
      };
    },
    { lsmTotal: 0, lsmAbertas: 0, descargaTotal: 0, descargaEmAndamento: 0, inventarioTotal: 0, inventarioAbertos: 0 },
    "getLogisticsSummary"
  );
}

export function getEfetivoHoje() {
  return safe(
    async () => {
      const hoje = hojeBrt();
      const data = unwrap(
        await db()
          .from("efetivo_diario")
          .select("*, cpp_setores(nome, cia_id)")
          .eq("data_referencia", hoje)
      );
      return data ?? [];
    },
    [] as any[],
    "getEfetivoHoje"
  );
}

export function getKpisMensais(meses = 6) {
  return safe(
    async () => {
      const data = unwrap(
        await db()
          .from("kpi_mensal")
          .select("*")
          .order("mes_referencia", { ascending: false })
          .limit(meses)
      );
      return (data ?? []).slice().reverse();
    },
    [] as any[],
    "getKpisMensais"
  );
}

export function getComunicacao() {
  return safe(
    async () => {
      // Chamado inline (não via unwrap()) porque o tipo de retorno de
      // .maybeSingle() é uma união com 3 variantes (sucesso / erro / "0
      // linhas sem erro") que trava a inferência genérica de unwrap<T> em
      // `never` — passar pelo helper genérico aqui derruba o build.
      const snapRes = await db()
        .from("comunicacao_snapshot")
        .select("*")
        .order("capturado_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (snapRes.error) throw new Error(snapRes.error.message);
      const snap = snapRes.data;
      if (!snap) return null;
      const [imprensa, parcerias, atencao] = await Promise.all([
        db().from("comunicacao_imprensa").select("id, veiculo").eq("snapshot_id", snap.id),
        db().from("comunicacao_parcerias").select("id, titulo, descricao").eq("snapshot_id", snap.id),
        db().from("comunicacao_atencao").select("id, texto").eq("snapshot_id", snap.id),
      ]);
      return {
        snapshot: snap,
        imprensa: unwrap(imprensa) ?? [],
        parcerias: unwrap(parcerias) ?? [],
        atencao: unwrap(atencao) ?? [],
      };
    },
    null as any,
    "getComunicacao"
  );
}

function kpiValor(rows: any[], fonte: string, dimensao: string, chave: string) {
  return rows.find((r) => r.fonte === fonte && r.dimensao === dimensao && r.chave === chave)?.valor ?? 0;
}

function kpiSerie(rows: any[], fonte: string, dimensao: string) {
  return rows
    .filter((r) => r.fonte === fonte && r.dimensao === dimensao)
    .sort((a, b) => (a.chave > b.chave ? 1 : -1));
}

/**
 * Seção P2 (Inteligência) — dados ingeridos de \\cmdo\...\P2\Matriz\P2 2026\
 * e correlatos (Disque-Denúncia, Procurados por Cia, Real Parque).
 * Ver memória "project_p2_16bpmm" para proveniência completa.
 */
export function getP2Overview() {
  return safe(
    async () => {
      const c = db();
      const [kpiRes, narrativasRes, procRPRes, relatoriosRes, capturasRes, arquivosRes] = await Promise.all([
        c.from("p2_kpi_agregados").select("fonte, dimensao, chave, valor"),
        c.from("p2_ocorrencias_narrativas").select("*").order("seq"),
        c.from("p2_procurados_real_parque").select("*").order("nome"),
        c.from("p2_relatorios_qualitativos").select("*").order("id"),
        c.from("p2_capturas_operacao_impacto").select("*").order("data_captura", { ascending: false }),
        c.from("p2_arquivos_fonte").select("nome_arquivo, tipo, linhas_reais, observacao").order("id"),
      ]);

      const kpi = unwrap(kpiRes) ?? [];

      return {
        dd: {
          pendente: kpiValor(kpi, "disque_denuncia", "status_total", "PENDENTE"),
          encerrada: kpiValor(kpi, "disque_denuncia", "status_total", "ENCERRADA"),
          positiva: kpiValor(kpi, "disque_denuncia", "status_total", "POSITIVA"),
          natureza: kpiSerie(kpi, "disque_denuncia", "natureza").map((r) => ({ natureza: r.chave, total: r.valor })),
          serieEncerrada: kpiSerie(kpi, "disque_denuncia_encerrada", "mes").map((r) => ({ mes: r.chave, total: r.valor })),
          seriePendente: kpiSerie(kpi, "disque_denuncia_pendente", "mes").map((r) => ({ mes: r.chave, total: r.valor })),
        },
        procuradosPorCia: kpiSerie(kpi, "procurados_por_cia_16bpmm", "cia").map((r) => ({ cia: r.chave, total: r.valor })),
        capturaSsp: {
          total: kpiValor(kpi, "captura_ssp", "total_geral", "total"),
          serie: kpiSerie(kpi, "captura_ssp", "mes").map((r) => ({ mes: r.chave, total: r.valor })),
        },
        produtividadeCriminal: kpiSerie(kpi, "produtividade_criminal", "ano_total").map((r) => ({ ano: r.chave, total: r.valor })),
        produtividadeFotocrim: kpiSerie(kpi, "fotocrim", "ano_total_capturas").map((r) => ({ ano: r.chave, total: r.valor })),
        narrativas: unwrap(narrativasRes) ?? [],
        procuradosRealParque: unwrap(procRPRes) ?? [],
        relatorios: unwrap(relatoriosRes) ?? [],
        capturasOperacaoImpacto: (unwrap(capturasRes) ?? []).filter(
          (r: any) => r.nome_capturado && !r.nome_capturado.includes("REGISTRO HISTÓRICO")
        ),
        arquivosFonte: unwrap(arquivosRes) ?? [],
      };
    },
    {
      dd: { pendente: 0, encerrada: 0, positiva: 0, natureza: [], serieEncerrada: [], seriePendente: [] },
      procuradosPorCia: [] as any[],
      capturaSsp: { total: 0, serie: [] as any[] },
      produtividadeCriminal: [] as any[],
      produtividadeFotocrim: [] as any[],
      narrativas: [] as any[],
      procuradosRealParque: [] as any[],
      relatorios: [] as any[],
      capturasOperacaoImpacto: [] as any[],
      arquivosFonte: [] as any[],
    },
    "getP2Overview"
  );
}

export async function getOverviewCounts() {
  return safe(
    async () => {
      const c = db();
      const [setores, frota, alertas, ocorr] = await Promise.all([
        c.from("cpp_setores").select("id", { count: "exact", head: true }).eq("ativo", true),
        c.from("viaturas").select("id", { count: "exact", head: true }).eq("situacao", "disponivel"),
        c.from("alertas_placa").select("id", { count: "exact", head: true }).eq("status", "pendente"),
        c.from("ocorrencias").select("id", { count: "exact", head: true }).in("status", ["aberta", "em_despacho"]),
      ]);
      // count vem preenchido mesmo com head:true; unwrap() só garante que um
      // eventual erro de query seja logado por safe() em vez de descartado.
      unwrap(setores);
      unwrap(frota);
      unwrap(alertas);
      unwrap(ocorr);
      return {
        viaturasDisponiveis: frota.count ?? null,
        alertasPendentes: alertas.count ?? null,
        ocorrenciasAbertas: ocorr.count ?? null,
        setores: setores.count ?? null,
      };
    },
    { viaturasDisponiveis: null, alertasPendentes: null, ocorrenciasAbertas: null, setores: null },
    "getOverviewCounts"
  );
}
