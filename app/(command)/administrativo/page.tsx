import Link from "next/link";
import { FileSpreadsheet, FolderOpen, ClipboardList, ExternalLink, Boxes, Shield, Fingerprint, Building2, ArrowRight } from "lucide-react";
import { PageHeader, Card, Badge } from "@/components/command/ui";
import {
  exigirPagina,
  contextoSessao,
  comparativoPermitido,
  unidadesDaAutorizacao,
} from "@/lib/db/permissoes";
import { UNIDADES } from "@/lib/unidades";

export const metadata = { title: "Setor Administrativo · CCO-16" };
export const dynamic = "force-dynamic";

const INVENTARIO_URL =
  "https://docs.google.com/spreadsheets/d/10Hu3swD2Q8oCbFNFP-675NDAabeMKt-e0Yo9EvSDyvQ/edit?usp=sharing";

const PLANILHAS = [
  {
    titulo: "Controle de Efetivo",
    descricao: "Escala, afastamentos e disponibilidade da tropa.",
    icon: ClipboardList,
    url: "https://docs.google.com/spreadsheets/d/1oFl8-SMvkjqFHV2jK5faP1mdE9_1Ij4pl1WA_5tS_Vw/edit?gid=398068649#gid=398068649",
  },
  {
    titulo: "Controle de Viaturas",
    descricao: "Situação da frota, manutenção e baixas.",
    icon: FolderOpen,
    url: "https://docs.google.com/spreadsheets/d/184S80OLZQriGwFED6qlZDlggpsLlMMb0zX9jyzqwu9o/edit?gid=54228781#gid=54228781",
  },
  {
    titulo: "Controle de Armamento e Munição",
    descricao: "Reserva de armas, insumos e apontamentos administrativos.",
    icon: FileSpreadsheet,
    url: "https://docs.google.com/spreadsheets/d/1gDE0KaSnTJfDc7JLsdo6QE4xsdhXbKS1GAOKCzcDi18/edit?gid=1875751469#gid=1875751469",
  },
  {
    titulo: "Controle de Material Bélico",
    descricao: "Mapa bélico, armas apreendidas e reserva de munição por companhia.",
    icon: Shield,
    url: "https://docs.google.com/spreadsheets/d/1e6PTQDtnm2FIpcDxwt8ZuN5qTykR1f7q3O9cA9r8xu4/edit?gid=118460593#gid=118460593",
  },
  {
    titulo: "Controle de Armamento Individual",
    descricao: "Distribuição de armamento por militar, seção e termo de vistoria.",
    icon: Fingerprint,
    url: "https://docs.google.com/spreadsheets/d/1x03nmSA4U3yGhxFovSXVNpMqP0bFaR4MhYNocK2QQRg/edit?usp=sharing",
  },
];

export default async function AdministrativoPage() {
  const sessao = await exigirPagina("/administrativo");
  const { aut } = await contextoSessao();
  const visiveis = unidadesDaAutorizacao(aut);
  const linkComandante =
    sessao.perfil === "cmt_cia" && sessao.unidade
      ? { href: `/companhia/${sessao.unidade}`, rotulo: `Painel da minha unidade: ${UNIDADES.find((u) => u.valor === sessao.unidade)?.rotulo ?? ""}` }
      : comparativoPermitido(aut) && visiveis.length > 0
        ? { href: "/companhia", rotulo: "Painéis das Companhias" }
        : null;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        titulo="Setor Administrativo"
        descricao="Planilhas e controles administrativos do 16º BPM/M — acesso centralizado para a tropa e gestores de seção."
        acao={<Badge tone="neutro"><FileSpreadsheet size={12} /> Planilhas</Badge>}
      />

      {linkComandante && (
        <Link href={linkComandante.href} className="mb-6 block">
          <Card className="flex items-center gap-5 border-azul/30 bg-azul/5 transition-colors hover:bg-azul/10">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-azul text-branco">
              <Building2 size={22} strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-branco">Comando de Companhia</h2>
                <Badge tone="informative">Sua unidade</Badge>
              </div>
              <p className="mt-1 text-xs text-branco/60">{linkComandante.rotulo}</p>
            </div>
            <ArrowRight size={16} className="shrink-0 text-branco/40" />
          </Card>
        </Link>
      )}

      {/* Inventário — controle patrimonial, destacado acima das planilhas de rotina */}
      <a
        href={INVENTARIO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-6 block"
      >
        <Card className="flex items-center gap-5 border-ouro/30 bg-ouro/5 transition-colors hover:bg-ouro/10">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-ouro text-azul-noite">
            <Boxes size={22} strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-branco">Inventário</h2>
              <Badge tone="attention">Patrimônio</Badge>
            </div>
            <p className="mt-1 text-xs text-branco/60">
              Levantamento patrimonial do 16º BPM/M — bens, equipamentos e materiais de carga,
              com localização e responsável.
            </p>
          </div>
          <ExternalLink size={16} className="shrink-0 text-branco/40" />
        </Card>
      </a>

      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-branco/35">
        Planilhas de controle
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLANILHAS.map(({ titulo, descricao, icon: Icon, url }) => (
          <a key={titulo} href={url} target="_blank" rel="noopener noreferrer">
            <Card className="flex h-full flex-col gap-3 transition-colors hover:bg-branco/10">
              <div className="flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-branco/5 text-ouro">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <ExternalLink size={14} className="text-branco/30" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-branco">{titulo}</h3>
                <p className="mt-1 text-xs text-branco/50">{descricao}</p>
              </div>
            </Card>
          </a>
        ))}
      </div>

      <p className="mt-4 text-xs text-branco/40">
        Os links abrem a planilha original do Google Sheets em uma nova aba. Edições feitas lá
        refletem aqui automaticamente — sem cópia ou duplicação de dados.
      </p>
    </div>
  );
}
