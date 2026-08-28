import Image from "next/image";
import Link from "next/link";

const PONTOS_DIRETRIZ = [
  {
    numero: "01",
    titulo: "FATOS DE INTERESSE POLICIAL",
    texto: "Eventos e registros relevantes",
    imagem: "/16bpmm/carrossel/slide-3.jpg",
  },
  {
    numero: "02",
    titulo: "ETIQUETAS DIGITAIS",
    texto: "Classificação das evidências",
    imagem: "/16bpmm/carrossel/slide-12.jpg",
  },
  {
    numero: "03",
    titulo: "CADEIA DE CUSTÓDIA",
    texto: "Integridade, registro e rastreabilidade",
    imagem: "/16bpmm/carrossel/slide-6.jpg",
  },
  {
    numero: "04",
    titulo: "MONITORAMENTO & CONTROLE",
    texto: "Aferição, conformidade e auditoria",
    imagem: "/16bpmm/carrossel/slide-5.jpg",
  },
  {
    numero: "05",
    titulo: "MODOS & TRANSMISSÃO",
    texto: "Funcionalidades da COP",
    imagem: "/16bpmm/carrossel/slide-7.jpg",
  },
  {
    numero: "06",
    titulo: "OBRIGAÇÕES DO OPERADOR",
    texto: "Acionamento, uso e encerramento",
    imagem: "/16bpmm/carrossel/slide-2.jpg",
  },
  {
    numero: "07",
    titulo: "ENTREGA IMEDIATA",
    texto: "Repercussão e indícios de desvios de conduta",
    imagem: "/16bpmm/carrossel/slide-8.jpg",
  },
] as const;

export function DiretrizEmFoco({
  hrefBase = "#diretriz-pdf",
  variante = "home",
}: {
  hrefBase?: string;
  variante?: "home" | "briefing";
}) {
  const espac = variante === "briefing" ? "my-0" : "my-10";
  return (
    <section aria-labelledby="diretriz-em-foco-titulo" className={espac}>
      <div className="mx-auto max-w-6xl px-4">
        <h2 id="diretriz-em-foco-titulo" className="sr-only">
          Registro Operacional · Governança da Auditoria de COP
        </h2>
        <Link
          href={hrefBase}
          aria-label="Registro Operacional · Governança da Auditoria de COP — abrir a Diretriz PM3-001/02/25"
          className="block overflow-hidden rounded-2xl bg-[#101d35] p-3 shadow-xl transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vermelho sm:p-6"
        >
          <div className="space-y-4 sm:space-y-5">
            <div className="border-b border-white/20 px-2 pb-4 text-white sm:px-3 sm:pb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e5d332] sm:text-xs">
                Diretriz PM3-001/02/25 · Ambiente Executivo de Governança, Controle e Auditabilidade das COPs
              </p>
              <h3 className="mt-2 font-serif text-xl font-bold uppercase sm:text-3xl">
                Registro Operacional · Governança da Auditoria de COP
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/70 sm:text-base">
                Pontos de relevância normativa para fiscalização, cadeia de custódia, monitoramento e gestão executiva.
              </p>
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-white/80">Diretriz em Foco</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {PONTOS_DIRETRIZ.map((ponto) => (
                <div
                  key={ponto.numero}
                  className="relative isolate min-h-72 overflow-hidden rounded-xl border border-white/20 bg-[#1d2c46] shadow-[0_10px_24px_rgba(0,0,0,0.2)] transition-transform duration-300 hover:-translate-y-1 sm:[&:first-child]:col-span-2"
                >
                  <Image
                    src={ponto.imagem}
                    alt={`Foto real da Polícia Militar para ${ponto.titulo.toLowerCase()}`}
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="-z-20 object-cover"
                    priority={variante === "home" && ponto.numero === "01"}
                  />
                  <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#071225] via-[#071225]/55 to-[#071225]/10" />
                  <div className="flex min-h-72 flex-col justify-end p-6 text-white sm:p-7">
                    <span className="text-4xl font-black leading-none text-[#e5d332]/90">{ponto.numero}</span>
                    <h4 className="mt-2 max-w-[18rem] text-sm font-black uppercase leading-tight">
                      {ponto.titulo}
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-white/75">{ponto.texto}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
