import { Poppins } from "next/font/google";
import { FileSpreadsheet, RefreshCw, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import { Card, Badge } from "@/components/command/ui";
import {
  InventarioCentral,
  Indicador,
  type EstadoFonte,
} from "@/components/command/inventario-central";
import { FONTES_INVENTARIO, consolidar, lerTodasAsFontes } from "@/lib/inventario-2026";
import { PortaoInventario } from "@/components/command/portao-inventario";
import { CabecalhoInventario } from "@/components/command/cabecalho-inventario";
import { inventarioLiberado } from "@/lib/chave-inventario";
import { sessaoAtual } from "@/lib/auth-simples";

// Mesma tipografia do padrão visual das páginas de unidade da intranet PMESP
// usado na Sala de Comando. Carregada aqui porque esta rota vive no grupo
// (public), que não tem o layout do comando.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const HOST = "https://portal-cco16.vercel.app";
const TITULO = "Inventário 2026 · 16º BPM/M";
const RESUMO =
  "Central de planilhas do levantamento patrimonial: companhias, Força Tática e seções do Estado-Maior numa página só. Carga contábil do LCM confrontada com o físico real, em leitura ao vivo.";
const OG = `${HOST}/og/16bpmminventario.png`;

export const metadata: Metadata = {
  title: TITULO,
  description: RESUMO,
  // Página de trabalho interno, aberta para facilitar o acesso da tropa e do
  // Comando sem login. Fora do índice dos buscadores de propósito: quem chega
  // é quem recebeu o endereço. O noindex NÃO atrapalha a prévia do WhatsApp:
  // o robô que monta o cartão lê as tags Open Graph, não o índice de busca.
  robots: { index: false, follow: false },
  alternates: { canonical: `${HOST}/16bpmminventario` },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "16º BPM/M",
    url: `${HOST}/16bpmminventario`,
    title: TITULO,
    description: RESUMO,
    images: [
      {
        url: OG,
        width: 1200,
        height: 630,
        alt: "Brasão do 16º BPM/M sobre fundo grafite e vermelho institucional, com o título Inventário 2026",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: RESUMO,
    images: [OG],
  },
};

// Sem revalidate de segmento: a página passou a ler cookie (chave de acesso),
// o que a torna dinâmica de qualquer forma. O cache continua onde importa, no
// fetch de cada planilha em lib/inventario-2026.ts (5 minutos).
export default async function Inventario2026Page({
  searchParams,
}: {
  searchParams: Promise<{ chave?: string | string[] }>;
}) {
  // Duas portas para a mesma central: a chave única, que a tropa recebe pelo
  // link, e a credencial individual da Sala de Comando, para quem já entrou lá.
  const [liberado, sessao] = await Promise.all([inventarioLiberado(), sessaoAtual()]);
  if (!liberado && !sessao) {
    const sp = await searchParams;
    const chave = Array.isArray(sp.chave) ? sp.chave[0] : sp.chave;
    return (
      <div
        className={`${poppins.variable} tema-institucional min-h-screen bg-tatico-fundo text-branco`}
      >
        <PortaoInventario erro={chave === "erro"} />
      </div>
    );
  }

  const leituras = await lerTodasAsFontes();
  const consolidado = consolidar(leituras);

  const estados: EstadoFonte[] = leituras.map((l) => ({
    chave: l.fonte.chave,
    ok: l.ok,
    erro: l.erro,
    resumo: consolidado.resumos[l.fonte.chave],
  }));

  const lidoEm = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });

  const fontesDeInventario = FONTES_INVENTARIO.filter((f) => !f.foraDoInventario);
  const preenchidas =
    fontesDeInventario.length - consolidado.semLancamento.length - consolidado.semAcesso.length;
  const percentual = Math.round((preenchidas / fontesDeInventario.length) * 100);

  return (
    <div
      className={`${poppins.variable} tema-institucional min-h-screen bg-tatico-fundo text-branco`}
    >
      {/* Cabeçalho próprio: no grupo (public) não existe a barra lateral da
          Sala de Comando, e ela não deveria aparecer mesmo — os links dela
          levam a páginas que continuam exigindo login. */}
      <CabecalhoInventario />

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* O título já está no cabeçalho-capa; aqui só o texto de apoio e o
            status ao vivo, sem repetir "Inventário 2026". */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <p className="max-w-2xl text-sm text-branco/60">
            Cada companhia e cada seção mantém a sua planilha de controle de material. Esta página
            lê todas ao vivo, exibe a planilha escolhida e consolida o que o Comando precisa
            acompanhar.
          </p>
          <div className="flex flex-col items-end gap-1.5">
            <Badge tone="neutro">
              <FileSpreadsheet size={12} /> {FONTES_INVENTARIO.length} planilhas
            </Badge>
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-branco/40">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              ao vivo
              <RefreshCw size={10} className="animate-spin text-branco/40 [animation-duration:3s]" />
              leitura de {lidoEm}
            </span>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
          <Indicador rotulo="Itens lançados" valor={consolidado.geral.total} icone="itens" />
          <Indicador rotulo="Confere" valor={consolidado.geral.confere} icone="confere" />
          <Indicador
            rotulo="Divergente"
            valor={consolidado.geral.divergente}
            destaque
            icone="divergente"
          />
          <Indicador
            rotulo="Sem conferência"
            valor={consolidado.geral.semConferencia}
            destaque
            icone="espera"
          />
          <Indicador
            rotulo="Não localizado"
            valor={consolidado.geral.naoLocalizado}
            destaque
            icone="perdido"
          />
          <Indicador rotulo="Em descarga" valor={consolidado.geral.descarga} icone="descarga" />
          <Indicador
            rotulo="Exige COFIM"
            valor={consolidado.geral.cofim}
            destaque
            icone="cofim"
          />
        </div>

        {/* Andamento: para o Comando, saber quem ainda não começou vale tanto
            quanto o número de bens já conferidos. */}
        <Card className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-bold text-branco">
                <TrendingUp size={15} className="text-vermelho" aria-hidden />
                Andamento do preenchimento
              </p>
              <p className="mt-0.5 text-xs text-branco/50">
                {preenchidas} de {fontesDeInventario.length} planilhas de inventário já têm item
                lançado
                {consolidado.semAcesso.length > 0 &&
                  ` · ${consolidado.semAcesso.length} sem acesso de leitura`}
                .
              </p>
              {consolidado.geral.total > 0 && (
                // Relacionar o bem no LCM não é conferir: a 1ª e a 4ª Cia
                // importaram a carga inteira de uma vez, e o comparativo
                // LCM × físico da maior parte segue em branco.
                <p className="mt-1 text-xs text-branco/50">
                  {consolidado.geral.confere + consolidado.geral.divergente} dos{" "}
                  {consolidado.geral.total} itens relacionados já têm o comparativo LCM × físico
                  preenchido; {consolidado.geral.semConferencia} aguardam conferência.
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-40 overflow-hidden rounded-full bg-branco/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-vermelho to-orange-400 transition-[width] duration-1000 ease-out"
                  style={{ width: `${percentual}%` }}
                />
              </div>
              <span className="tabular-nums text-sm font-extrabold text-branco">
                {percentual}%
              </span>
            </div>
          </div>
        </Card>

        <InventarioCentral
          fontes={FONTES_INVENTARIO}
          estados={estados}
          divergencias={consolidado.divergencias}
          descargas={consolidado.descargas}
        />

        <p className="mt-8 border-t border-branco/10 pt-4 text-[11px] leading-relaxed text-branco/40">
          Leitura direta das planilhas do Google Sheets da conta institucional
          operacional16bpmm@gmail.com, atualizada a cada cinco minutos. A fonte de verdade continua
          sendo a planilha de cada unidade: correções e lançamentos são feitos lá, e esta página
          apenas reflete o que estiver preenchido. Modelo único de controle de material do 16º BPM/M,
          com as quatro etapas do levantamento (LCM contábil, físico real, comparativo e situação
          atual).
        </p>
      </main>
    </div>
  );
}
