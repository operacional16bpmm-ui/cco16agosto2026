import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ShieldCheck } from "lucide-react";

import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { FaixaCreditos } from "@/components/publico16/creditos";
import { BotaoAdmin } from "@/components/publico16/cop/botao-admin";
import { identidadeCop } from "@/lib/db/cop2026-autorizados";
import { ehAdminCop } from "@/lib/cop2026-acesso";
import { WHATSAPP_AJUDA } from "@/lib/cop2026-inconsistencia-config";
import { FormularioInconsistencia } from "./formulario-inconsistencia";

export const metadata: Metadata = {
  title: "Relatar problemas do sistema · COP 2026 · 16º BPM/M",
  description:
    "Registro de indisponibilidade da COP — prova, com data e hora, de que a fração comunicou.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * RELATAR PROBLEMAS DO SISTEMA.
 *
 * ABERTA, como o lançamento — e aqui a razão é ainda mais forte. O caso que
 * originou esta tela é o de uma fração que **não avisou**; qualquer atrito a
 * mais entre descobrir a queda e registrar o aviso trabalha a favor de o
 * silêncio se repetir. Exigir conta Google de quem está na rua, às 22h de um
 * domingo, com a plataforma fora do ar, é desenhar a tela para não ser usada.
 *
 * O que substitui o login é o mesmo do lançamento: RE e nome declarados, e o
 * carimbo de servidor em `registrado_em`, que ninguém do lado do cliente
 * escreve.
 */
export default async function InconsistenciasPage() {
  const ehAdmin = ehAdminCop((await identidadeCop())?.email);

  return (
    <div className="tema-institucional min-h-screen bg-tatico-fundo text-[15px] text-branco">
      <FaixaCreditos />

      <header className="border-b border-slate-300/80 bg-[#edf2f6] text-[#07182d]">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-4 py-3">
          <Link
            href="/cop2026"
            className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-bold text-[#15304c]/75 hover:text-[#ca0202] sm:min-h-0"
          >
            <ArrowLeft size={15} /> Início
          </Link>
          <BotaoAdmin ehAdmin={ehAdmin} className="ml-auto" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#ca0202]">
          <AlertTriangle size={15} aria-hidden />
          Relatar problemas do sistema
        </p>
        <h1 className="mt-2 font-serif text-[1.9rem] font-black leading-tight text-branco sm:text-[2.3rem]">
          A COP parou de funcionar?
          <span className="block text-texto-suave">Registre aqui, na hora.</span>
        </h1>

        {/* O porquê, na primeira tela e sem rodeio. Quem entende para que
            serve preenche; quem acha que é burocracia, não. */}
        <div className="mt-5 rounded-xl border-2 border-[#ca0202]/35 bg-[#ca0202]/[0.06] p-4 text-[14.5px] leading-relaxed text-texto-suave">
          <p className="flex items-start gap-2">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#ca0202]" aria-hidden />
            <span>
              Este registro <strong className="text-branco">protege a sua fração</strong>. Ele prova,
              com data e hora, que o problema foi comunicado — para que a falta da COP não seja
              cobrada depois como se ninguém tivesse avisado. Leva menos de um minuto e{" "}
              <strong className="text-branco">não depende de login</strong>.
            </span>
          </p>
        </div>

        <div className="mt-6 rounded-2xl border-2 border-slate-300/85 bg-gradient-to-b from-white via-[#f8fafc] to-[#edf3f8] p-5 sm:p-7">
          <FormularioInconsistencia whatsappAjuda={WHATSAPP_AJUDA} />
        </div>

        <div className="mt-6 border-t border-branco/10 pt-4 text-[13px] leading-relaxed text-branco/45">
          <p>
            <strong>Como ler este formulário.</strong> Os campos com asterisco são os quatro que
            fazem o registro valer como prova: qual fração, quando começou, o que parou e quem
            avisou. Todo o resto ajuda a apurar, mas nada impede o envio — relato incompleto
            registrado vale mais que relato completo que ninguém mandou. O que ficar fora do
            padrão entra assim mesmo e vira pendência de correção na área de administração.
          </p>
        </div>
      </main>

      <RodapeCop nota="Registro de indisponibilidade da COP — documento operacional do 16º BPM/M." />
    </div>
  );
}
