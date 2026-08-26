import { Megaphone, TrendingUp, Newspaper, Handshake, AlertTriangle, Award } from "lucide-react";
import { PageHeader, Card, Badge, DataState } from "@/components/command/ui";
import { ListaDocumentosSecao } from "@/components/documentos/lista-documentos-secao";
import { getComunicacao } from "@/lib/db";
import { getP5Reconhecimento } from "@/lib/db/p5";
import { exigirPagina } from "@/lib/db/permissoes";

export const metadata = { title: "Comunicação · Reconhecimento · CCO-16" };
export const dynamic = "force-dynamic";

export default async function ComunicacaoPage() {
  await exigirPagina("/comunicacao");
  const [c, p5] = await Promise.all([getComunicacao(), getP5Reconhecimento()]);

  if (!c) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader
          titulo="Comunicação · Reconhecimento"
          descricao="Alcance do @16bpmm_oficial e repercussão institucional."
          acao={<Badge tone="neutro"><TrendingUp size={12} /> sem snapshot</Badge>}
        />
        <DataState
          icon={<Megaphone size={28} />}
          titulo="Nenhum snapshot de comunicação cadastrado"
          texto="Cadastre um snapshot em comunicacao_snapshot (Instagram Insights + varredura de imprensa) para esta tela ganhar vida."
        />
        {p5.temDados && (
          <Card className="mt-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ouro">
              <Award size={15} /> Reconhecimento · P5 ({new Date().getFullYear()})
            </h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="text-2xl font-extrabold text-branco">{p5.lmpTotalAno}</p><p className="text-[11px] text-branco/55">LMP concedidas</p></div>
              <div><p className="text-2xl font-extrabold text-branco">{p5.agraciadosTotalAno}</p><p className="text-[11px] text-branco/55">Agraciados</p></div>
              <div><p className="text-2xl font-extrabold text-branco">{p5.indicadosTotalAno}</p><p className="text-[11px] text-branco/55">Indicados</p></div>
            </div>
          </Card>
        )}
      </div>
    );
  }

  const s = c.snapshot;
  const kpis = [
    { v: s.seguidores.toLocaleString("pt-BR"), r: "Seguidores" },
    { v: s.visualizacoes_90d, r: "Visualizações" },
    { v: s.contas_alcancadas, r: "Contas alcançadas" },
    { v: s.interacoes, r: "Interações" },
    { v: s.visitas_perfil, r: "Visitas ao perfil" },
    { v: `${s.alcance_fora_base_pct}%`, r: "Alcance fora da base" },
  ];
  const porConteudo = [
    { tipo: "Reels", views: s.reels_pct_views, inter: s.reels_pct_inter },
    { tipo: "Stories", views: s.stories_pct_views, inter: s.stories_pct_inter },
    { tipo: "Posts", views: s.posts_pct_views, inter: s.posts_pct_inter },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="Comunicação · Reconhecimento"
        descricao={`Alcance do ${s.conta} e repercussão institucional. ${s.periodo}.`}
        acao={<Badge tone="ok"><TrendingUp size={12} /> {s.conta}</Badge>}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.r}>
            <p className="text-2xl font-extrabold tracking-tight text-ouro md:text-3xl">{k.v}</p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-branco/55">
              {k.r}
            </p>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ouro">
            <Megaphone size={15} /> Alcance por tipo de conteúdo
          </h2>
          <div className="space-y-3">
            {porConteudo.map((cnt) => (
              <div key={cnt.tipo}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-branco">{cnt.tipo}</span>
                  <span className="tempo text-branco/55">
                    {cnt.views != null ? `${cnt.views}% views · ${cnt.inter ?? "—"}% interações` : "sem dado"}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-branco/10">
                  {/* cnt.views pode vir null (coluna nullable) — antes isso
                      virava `width: "null%"`, CSS inválido que o navegador
                      ignora, deixando a barra 100% cheia como se fosse
                      alcance máximo. 0% quando não há dado. */}
                  <div className="h-full rounded-full bg-azul" style={{ width: `${cnt.views ?? 0}%` }} />
                </div>
              </div>
            ))}
          </div>
          {s.top_reel_views && (
            <p className="mt-4 rounded-md border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-xs text-branco/70">
              Reel de maior audiência: <strong className="text-emerald-700">{s.top_reel_views}</strong>{" "}
              visualizações · {s.top_reel_inter} interações ({s.top_reel_data} — {s.top_reel_tema}).
            </p>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ouro">
            <Handshake size={15} /> Reconhecimento institucional
          </h2>
          <div className="space-y-3">
            {c.parcerias.map((p: any) => (
              <div key={p.id} className="rounded-lg border border-branco/10 bg-tatico-fundo/40 p-3">
                <p className="text-sm font-semibold text-branco">{p.titulo}</p>
                <p className="mt-0.5 text-xs text-branco/55">{p.descricao}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {p5.temDados && (
        <Card className="mt-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ouro">
            <Award size={15} /> Reconhecimento · P5 ({new Date().getFullYear()})
          </h2>
          <div className="grid grid-cols-3 gap-3 text-center sm:grid-cols-3">
            <div className="rounded-lg border border-branco/10 bg-tatico-fundo/40 p-3">
              <p className="text-2xl font-extrabold text-branco">{p5.lmpTotalAno}</p>
              <p className="text-[11px] uppercase tracking-wide text-branco/55">LMP concedidas</p>
            </div>
            <div className="rounded-lg border border-branco/10 bg-tatico-fundo/40 p-3">
              <p className="text-2xl font-extrabold text-branco">{p5.agraciadosTotalAno}</p>
              <p className="text-[11px] uppercase tracking-wide text-branco/55">Agraciados (medalhas)</p>
            </div>
            <div className="rounded-lg border border-branco/10 bg-tatico-fundo/40 p-3">
              <p className="text-2xl font-extrabold text-branco">{p5.indicadosTotalAno}</p>
              <p className="text-[11px] uppercase tracking-wide text-branco/55">Indicados</p>
            </div>
          </div>
          {p5.campanhasRecentes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {p5.campanhasRecentes.map((camp, i) => (
                <span
                  key={i}
                  className="rounded-full border border-branco/15 bg-branco/5 px-3 py-1 text-xs font-medium text-branco/75"
                >
                  {camp.campanha} · {camp.mes ? `${String(camp.mes).padStart(2, "0")}/` : ""}
                  {camp.ano}: {camp.quantidade}
                </span>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card className="mt-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ouro">
          <Newspaper size={15} /> Repercussão na imprensa
        </h2>
        <div className="flex flex-wrap gap-2">
          {c.imprensa.map((v: { id: number; veiculo: string }) => (
            <span
              key={v.id}
              className="rounded-full border border-branco/15 bg-branco/5 px-3 py-1 text-xs font-medium text-branco/75"
            >
              {v.veiculo}
            </span>
          ))}
        </div>
      </Card>

      <Card className="mt-4 border-ouro/20 bg-ouro/5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ouro">
          <AlertTriangle size={15} /> Pontos de atenção
        </h2>
        <ul className="space-y-2">
          {c.atencao.map((a: { id: number; texto: string }) => (
            <li key={a.id} className="flex gap-2 text-xs leading-relaxed text-branco/75">
              <span className="text-ouro">•</span> {a.texto}
            </li>
          ))}
        </ul>
      </Card>

      <p className="mt-4 text-xs text-branco/40">
        Fonte: {s.fonte} · capturado em {s.capturado_em}. Dado real do banco (comunicacao_snapshot) —
        atualize inserindo um novo snapshot a cada relatório da Comunicação Estratégica.
      </p>

      <ListaDocumentosSecao secao="comunicacao" />
    </div>
  );
}
