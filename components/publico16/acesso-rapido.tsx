import Link from "next/link";
import {
  IconeBriefing,
  IconeDashboard,
  IconeLancarAuditoria,
  IconePlanilha,
  IconeRestrito,
} from "@/components/publico16/icones-cop";
import { AjudaWhatsApp } from "@/components/publico16/ajuda-whatsapp";

/**
 * Barra de ações da página da auditoria, no padrão do portal institucional da
 * PMESP: cartões de borda fina com ícone vazado em vermelho. O primeiro é a
 * ação diária da tropa — preto com vermelho, para ninguém ter dúvida de onde
 * se preenche o formulário. Os demais seguem branco e vermelho.
 */
type Atalho = {
  rotulo: string;
  nota: string;
  href: string;
  icone: React.ReactNode;
  externo?: boolean;
  restrito?: boolean;
};

export function AcessoRapido({
  urlFormulario,
  urlPlanilha,
}: {
  urlFormulario: string;
  urlPlanilha: string;
}) {
  const atalhos: Atalho[] = [
    {
      rotulo: "Planilha de controle",
      nota: "Acesso restrito a autorizados",
      href: urlPlanilha,
      icone: <IconePlanilha size={44} />,
      externo: true,
      restrito: true,
    },
    {
      rotulo: "Dashboard de controle",
      nota: "Acesso restrito a autorizados",
      href: "/cop2026/dashboard",
      icone: <IconeDashboard size={44} />,
      restrito: true,
    },
    {
      rotulo: "Gerar briefing executivo",
      nota: "Resultados e metas em slides",
      href: "/cop2026/briefing",
      icone: <IconeBriefing size={44} />,
    },
  ];

  const classeCartao =
    "group flex h-full flex-col justify-between rounded-lg border-2 border-[#ca0202]/20 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.07)] transition-all duration-300 hover:-translate-y-1 hover:border-[#ca0202] hover:shadow-[0_10px_28px_rgba(202,2,2,0.18)]";

  return (
    <section className="border-b border-black/10 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-serif text-2xl font-bold uppercase tracking-[0.05em] text-[#111] sm:text-[26px]">
          Acesso rápido
        </h2>
        <div className="mt-3 mb-9 flex items-center">
          <span className="h-[3px] w-24 bg-[#ca0202]" />
          <span className="h-[3px] w-72 max-w-full bg-black/10" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* AÇÃO DIÁRIA — preto e vermelho, o botão que a tropa procura. O
              wrapper existe só para pendurar o socorro do WhatsApp no canto:
              botão dentro de link seria HTML inválido. */}
          <div className="relative h-full">
            <AjudaWhatsApp />
            <a
              href={urlFormulario}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex h-full flex-col justify-between overflow-hidden rounded-lg border-2 border-[#ca0202] bg-[#111] p-6 shadow-[0_10px_28px_rgba(0,0,0,0.28)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_16px_38px_rgba(202,2,2,0.35)]"
            >
              {/* brilho que corre no hover: dá vida sem poluir */}
              <span className="pointer-events-none absolute -inset-x-10 -top-16 h-24 rotate-12 bg-[#ca0202]/25 blur-2xl transition-transform duration-700 group-hover:translate-y-40" />
              <span className="relative">
                <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#ca0202] text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
                  <IconeLancarAuditoria size={30} />
                </span>
                <span className="mt-4 block text-[11px] font-black uppercase tracking-[0.18em] text-[#ff5a5a]">
                  Formulário da auditoria
                </span>
                <span className="mt-1 block font-serif text-xl font-bold leading-snug text-white">
                  Lançar auditoria do turno
                </span>
                <span className="mt-2 block text-[14px] leading-snug text-white/65">
                  É aqui que você preenche. Mínimo de 3 ID&apos;s de mídia por
                  turno.
                </span>
              </span>
              <span className="relative mt-5 inline-flex items-center justify-center rounded-md bg-[#ca0202] px-5 py-3.5 text-[15px] font-bold uppercase tracking-wide text-white transition-colors group-hover:bg-[#e40707]">
                Preencher agora
              </span>
            </a>
          </div>

          {atalhos.map((a) => {
            const conteudo = (
              <>
                <span>
                  <span className="flex h-12 w-12 items-center justify-center text-[#ca0202] transition-transform duration-300 group-hover:scale-110">
                    {a.icone}
                  </span>
                  <span className="mt-3 block font-serif text-[17px] font-bold leading-snug text-[#111]">
                    {a.rotulo}
                  </span>
                </span>
                <span
                  className={`mt-4 inline-flex items-center gap-2 text-[13px] font-black uppercase tracking-wide ${
                    a.restrito ? "text-[#ca0202]" : "text-black/50"
                  }`}
                >
                  {a.restrito && <IconeRestrito size={17} />}
                  {a.nota}
                </span>
              </>
            );
            return a.externo ? (
              <a
                key={a.rotulo}
                href={a.href}
                target="_blank"
                rel="noopener noreferrer"
                className={classeCartao}
              >
                {conteudo}
              </a>
            ) : (
              <Link key={a.rotulo} href={a.href} className={classeCartao}>
                {conteudo}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
