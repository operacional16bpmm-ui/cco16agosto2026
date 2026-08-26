import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Building2, ArrowRight, ShieldCheck } from "lucide-react";
import { PageHeader, Card, Badge, DataState } from "@/components/command/ui";
import { getSecaoDashboard, ultimoValorMensal } from "@/lib/db/secao";
import { valorDaUnidade } from "@/lib/db/companhia";
import {
  contextoSessao,
  comparativoPermitido,
  unidadesDaAutorizacao,
} from "@/lib/db/permissoes";
import { UNIDADES, ciaNumerica } from "@/lib/unidades";

export const metadata = { title: "Companhias · CCO-16" };
export const dynamic = "force-dynamic";

export default async function CompanhiasIndexPage() {
  const { sessao, aut } = await contextoSessao();
  if (!sessao || !aut.valida) redirect("/login?redirect=/companhia");
  if (aut.deveTrocarSenha) redirect("/trocar-senha");

  // Sem o comparativo liberado: quem enxerga UMA unidade (o Cmt de Cia, ou
  // quem só recebeu uma Companhia) vai direto para ela; os demais, 404.
  if (!comparativoPermitido(aut)) {
    const visiveis = unidadesDaAutorizacao(aut);
    if (visiveis.length === 1) redirect(`/companhia/${visiveis[0]}`);
    notFound();
  }

  const [p1, p3, ft] = await Promise.all([
    getSecaoDashboard("p1"),
    getSecaoDashboard("p3"),
    getSecaoDashboard("ft"),
  ]);

  // Cada métrica no seu próprio mês mais recente: efetivo (P1) costuma estar
  // um mês à frente da produtividade (P3), e pinar um único mês fazia toda a
  // coluna de presos/armas aparecer vazia mesmo com dado no mês anterior.
  const valor = (
    fatos: typeof p1.fatos,
    ind: string,
    cia: number | null
  ): number | null => ultimoValorMensal(fatos, ind, cia ?? undefined)?.valor ?? null;

  const linhas = UNIDADES.map((u) => {
    const cia = ciaNumerica(u.valor);
    if (u.valor === "ft") {
      // A FT não tem número de Cia: efetivo vem de secao='ft' (snapshot anual
      // efetivo_total), e não há recorte de presos/armas por FT em fato_secao.
      const anoFT = Math.max(...ft.fatos.filter((f) => f.indicador === "efetivo_total").map((f) => f.ano), 0) || undefined;
      return {
        unidade: u,
        efetivo: valorDaUnidade(ft.fatos, "efetivo_total", null, anoFT),
        presos: null as number | null,
        armas: null as number | null,
        ehFT: true,
      };
    }
    return {
      unidade: u,
      efetivo: valor(p1.fatos, "efetivo_existente", cia),
      presos: valor(p3.fatos, "presos", cia),
      armas: valor(p3.fatos, "armas_apreendidas", cia),
      ehFT: false,
    };
  });

  const notaRef = "último mês consolidado";

  const temDados = p1.temDados || p3.temDados;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        titulo="Companhias do 16º BPM/M"
        descricao="Visão comparativa das unidades subordinadas — efetivo e produtividade lado a lado. Abra uma Companhia para o painel completo e as pendências do comandante."
        acao={
          <Badge tone="informative">
            <Building2 size={12} /> {notaRef}
          </Badge>
        }
      />

      {!temDados ? (
        <DataState titulo="Sem dados das Companhias carregados" texto="A ingestão de P1/P3 ainda não foi executada neste ambiente." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {linhas.map(({ unidade, efetivo, presos, armas, ehFT }) => (
            <Link key={unidade.valor} href={`/companhia/${unidade.valor}`}>
              <Card className="flex h-full flex-col transition-colors hover:bg-branco/[0.06]">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-branco">{unidade.rotulo}</h2>
                    <p className="text-xs text-branco/50">{unidade.area}</p>
                  </div>
                  {ehFT ? (
                    <Badge tone="attention"><ShieldCheck size={12} /> FT</Badge>
                  ) : (
                    <span className="text-lg font-black text-branco/15">{unidade.cia}ª</span>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Metrica rotulo="Efetivo" valor={efetivo} />
                  <Metrica rotulo="Presos" valor={presos} />
                  <Metrica rotulo="Armas" valor={armas} />
                </div>

                <span className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-azul">
                  Abrir painel <ArrowRight size={12} />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Metrica({ rotulo, valor }: { rotulo: string; valor: number | null }) {
  return (
    <div className="rounded-lg border border-branco/10 bg-tatico-fundo/40 py-2">
      <p className={`text-xl font-extrabold tracking-tight ${valor != null ? "text-branco" : "text-branco/20"}`}>
        {valor ?? "—"}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-branco/40">{rotulo}</p>
    </div>
  );
}
