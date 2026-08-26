import { FileText, ExternalLink, Paperclip, Target } from "lucide-react";
import { PageHeader, Card, Badge, DataState } from "@/components/command/ui";
import { exigirPagina } from "@/lib/db/permissoes";
import { DADOS_BOLETINS, type Boletim } from "@/lib/dados-boletins";

/**
 * Resumo do Boletim Geral PM e do Boletim Interno do CPA/M-5.
 *
 * Rota protegida de propósito: o conteúdo é publicação interna da
 * Corporação, com nome e RE de policial militar. Está dentro do grupo
 * (command), que já exige sessão, e o proxy é fail-closed.
 *
 * Os dados vêm de lib/dados-boletins.ts, arquivo gerado pelo coletor que
 * roda na máquina de dentro da rede PMESP. A Vercel está na internet
 * pública e não alcança nem o site da DP nem o SISBOL, então não há fetch
 * em tempo de requisição: o que a página mostra é o que foi colhido,
 * resumido e commitado.
 */

export const metadata = { title: "Boletins · BG e BI · CCO-16" };

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/**
 * Datas chegam como "AAAA-MM-DD". Formatar por recorte de string, nunca por
 * new Date(iso): o construtor lê a string como UTC e, em UTC-3, devolve o
 * dia anterior.
 */
function dataBR(iso: string) {
  if (!iso) return "sem data";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function diaDaSemana(iso: string) {
  if (!iso) return "";
  const [a, m, d] = iso.split("-").map(Number);
  return DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
}

function rotulo(b: Boletim) {
  return b.tipo === "BG"
    ? `Bol G PM ${b.numero}/${b.ano}`
    : `BI CPA/M-5 ${b.numero}/${b.ano}`;
}

/**
 * Badge do tipo de boletim, fora do sistema de tons de components/command/ui.tsx
 * de propósito: os dois tipos são categoria, não severidade, então os dois
 * ficam no azul institucional. O vermelho da página inteira mora só dentro do
 * bloco de pertinência, para que aparecer em vermelho signifique sempre a
 * mesma coisa: "isto aqui alcança a Unidade e merece leitura".
 */
// Classes por extenso, e não montadas por template literal: o Tailwind
// varre o código-fonte em busca de strings literais de classe em tempo de
// build, então `border-${cor}/35` nunca seria gerado no CSS final.
const CORES_TIPO: Record<Boletim["tipo"], string> = {
  BG: "border-azul/35 bg-azul/8 text-azul",
  BI: "border-azul-escuro/35 bg-azul-escuro/8 text-azul-escuro",
};

function BadgeTipo({ tipo }: { tipo: Boletim["tipo"] }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${CORES_TIPO[tipo]}`}
    >
      {tipo === "BG" ? "Boletim Geral" : "Boletim Interno"}
    </span>
  );
}

function CartaoBoletim({ b }: { b: Boletim }) {
  return (
    <Card className="mb-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <BadgeTipo tipo={b.tipo} />
            <h3 className="text-lg font-bold text-branco">{rotulo(b)}</h3>
            {b.naSemana && <Badge tone="ok">desta semana</Badge>}
          </div>
          <p className="mt-1 text-xs text-branco/45">
            {dataBR(b.data)} {diaDaSemana(b.data) && `(${diaDaSemana(b.data)})`} · {b.origem} ·{" "}
            {b.paginas} páginas · {b.totalItens} itens publicados
          </p>
        </div>

        {b.url && (
          <a
            href={b.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-branco/15 bg-branco/5 px-3 py-1.5 text-xs font-medium text-branco/70 transition hover:border-branco/30 hover:text-branco"
          >
            {b.urlEhGrade ? <ExternalLink size={13} /> : <FileText size={13} />}
            {b.urlEhGrade ? "Consultar no SISBOL" : "Ver o boletim"}
          </a>
        )}
      </div>

      {b.resumo ? (
        <p className="text-sm leading-relaxed text-branco/70">{b.resumo}</p>
      ) : (
        <p className="text-sm italic text-branco/40">
          Resumo ainda não escrito para este boletim. Os destaques abaixo saem da
          leitura automática do texto.
        </p>
      )}

      {b.pertinencias.length > 0 && (
        <div className="mt-4 rounded-lg border border-vermelho/25 bg-vermelho/5 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-vermelho">
            <Target size={12} /> Pertinência ao 16º BPM/M
          </p>
          <ul className="space-y-2">
            {b.pertinencias.map((p, i) => (
              <li key={i} className="text-sm leading-relaxed text-branco/75">
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {b.destaques.length > 0 && (
        <details className="mt-4 group">
          <summary className="cursor-pointer text-xs font-medium text-branco/50 transition hover:text-branco/80">
            Itens marcados na leitura automática ({b.destaques.length})
          </summary>
          <ul className="mt-3 space-y-2 border-l border-branco/10 pl-4">
            {b.destaques.map((d, i) => (
              <li key={i} className="text-xs">
                <span className="font-medium text-branco/75">{d.titulo}</span>
                {d.parte && <span className="text-branco/35"> · {d.parte}</span>}
                <div className="text-branco/45">
                  {d.motivo}
                  {d.notas.length > 0 && <> · NOTA {d.notas.join("; ")}</>}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {b.anexos.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-branco/10 pt-3">
          <span className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-branco/35">
            <Paperclip size={11} /> Anexos
          </span>
          {b.anexos.map((a, i) => (
            <a
              key={i}
              href={a.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-azul underline underline-offset-2 hover:text-branco"
            >
              {a.titulo || `Documento ${i + 1}`}
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}

function Secao({
  titulo,
  descricao,
  boletins,
  vazio,
}: {
  titulo: string;
  descricao: string;
  boletins: Boletim[];
  vazio: string;
}) {
  return (
    <section className="mb-10">
      <div className="mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-branco/80">{titulo}</h2>
        <p className="mt-0.5 text-xs text-branco/40">{descricao}</p>
      </div>
      {boletins.length > 0 ? (
        boletins.map((b) => <CartaoBoletim key={`${b.tipo}-${b.numero}-${b.ano}`} b={b} />)
      ) : (
        <DataState titulo={vazio} />
      )}
    </section>
  );
}

export default async function BoletinsPage() {
  await exigirPagina("/boletins");

  const { boletins, semana, geradoEm } = DADOS_BOLETINS;
  const daSemana = boletins.filter((b) => b.naSemana);
  const bg = boletins.filter((b) => b.tipo === "BG").slice(0, 4);
  const bi = boletins.filter((b) => b.tipo === "BI").slice(0, 4);
  const comPertinencia = boletins.filter((b) => b.pertinencias.length > 0).length;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        titulo="Boletins"
        descricao="O que a Corporação publicou sobre a Unidade nos últimos dias: Boletim Geral PM e Boletim Interno do CPA/M-5, nosso Grande Comando, resumidos e com o endereço direto de cada documento."
        acao={
          <Badge tone={comPertinencia > 0 ? "informative" : "neutro"}>
            <Target size={12} /> {comPertinencia} de {boletins.length} tocam a Unidade
          </Badge>
        }
      />

      <Secao
        titulo="Semana corrente"
        descricao={`De ${dataBR(semana.inicio)} a ${dataBR(semana.fim)}. Tudo que foi publicado nas duas fontes dentro da semana.`}
        boletins={daSemana}
        vazio="Nenhum boletim publicado nesta semana ainda."
      />

      <Secao
        titulo="Boletim Geral PM"
        descricao="Publicado pelo Quartel do Comando Geral em dias úteis · últimos 4. O link leva ao PDF no repositório institucional, que só responde de dentro da rede PMESP."
        boletins={bg}
        vazio="Sem Boletim Geral coletado."
      />

      <Secao
        titulo="Boletim Interno · CPA/M-5"
        descricao="Publicado pelo Comando de Policiamento de Área Metropolitana 5 · últimos 4. Reúne as matérias do 16º e das demais Unidades subordinadas."
        boletins={bi}
        vazio="Sem Boletim Interno coletado."
      />

      <Card className="text-xs leading-relaxed text-branco/45">
        <p className="mb-2 font-semibold text-branco/70">De onde vem e como atualiza</p>
        <p>
          O Boletim Geral sai do site da Diretoria de Pessoal, que responde sem login
          dentro da rede. O Boletim Interno sai do SISBOL, que exige login com CPF e
          senha do SINGES/COBOM, e por isso a coleta dele depende de sessão aberta pelo
          próprio usuário. O SISBOL também não dá endereço fixo por boletim: o PDF vem de
          uma requisição com identificador de sessão, então o link acima leva à grade de
          consulta, onde o boletim aparece pelo número e pela data.
        </p>
        <p className="mt-2">
          Coleta e resumo rodam na máquina dentro da rede e são publicados aqui. Última
          atualização: {geradoEm ? geradoEm.replace("T", " às ") : "sem registro"}.
        </p>
      </Card>
    </div>
  );
}
