import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { RodapeCop } from "@/components/publico16/cop/rodape-cop";
import { FaixaCreditos } from "@/components/publico16/creditos";
import { identidadeCop } from "@/lib/db/cop2026-autorizados";
import { ehAdminCop } from "@/lib/cop2026-acesso";
import { BotaoAdmin } from "@/components/publico16/cop/botao-admin";
import { FormularioLancamento } from "./formulario-lancamento";

export const metadata: Metadata = {
  title: "Lançar auditoria · COP 2026 · 16º BPM/M",
  description:
    "Registro da auditoria das câmeras operacionais corporais do 16º BPM/M — Diretriz PM3-001/02/25.",
  // A página é aberta por QR Code e por link no WhatsApp, não por busca.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Lançamento da Auditoria de COP — a rota que substitui o Google Forms.
 *
 * ABERTA POR PADRÃO, e isso é decisão, não esquecimento. O gate escolhido para
 * o lançamento nunca foi login: é o PADRÃO DO IDENTIFICADOR — lançamento fora
 * do formato denuncia o erro. A Diretriz PM3-001/02/25 §6.1.6 já exige
 * credencial pessoal do SiGCED para auditar, então o ID só existe se a pessoa
 * esteve autenticada lá; pedir uma segunda credencial é autenticar de novo o
 * que já foi autenticado, e custa adesão bem na métrica que se quer aumentar
 * (17% da lista de autorizados de hoje sequer usa conta Google nativa).
 *
 * Quem quiser exigir a conta Google no envio liga `COP2026_LANCAR_EXIGE_LOGIN`
 * e a rota passa a viver atrás do mesmo portão do Dashboard — variável de
 * ambiente, para poder ser relaxada em minutos se a adesão cair, sem deploy.
 */
export default async function LancarPage() {
  // Só para carimbar a autoria de quem já está logado. `null` é o caso normal.
  const identidade = await identidadeCop();

  return (
    <div className="tema-institucional flex min-h-screen flex-col bg-tatico-fundo text-[15px] text-branco">
      <FaixaCreditos />

      <header className="border-b border-borda bg-tatico-super">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-5 py-4">
          <Image
            src="/brand/16bpmm.png"
            alt="Brasão do 16º BPM/M"
            width={48}
            height={48}
            className="h-11 w-auto"
            priority
          />
          <div>
            <p className="font-serif text-base font-bold uppercase leading-tight tracking-wide sm:text-lg">
              Auditoria &amp; Governança das Câmeras Operacionais Corporais
            </p>
            <p className="mt-0.5 text-[12px] text-texto-suave">
              16º BPM/M — &ldquo;1º Ten PM Fernão&rdquo; · Diretriz PM3-001/02/25
            </p>
          </div>
          {/* Mesma identidade já lida para carimbar a autoria do lançamento —
              nenhuma consulta a mais só para decidir se o botão aparece. */}
          <BotaoAdmin ehAdmin={ehAdminCop(identidade?.email)} className="ml-auto shrink-0" />
        </div>
        <div className="faixa-institucional h-1.5" />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8">
        <div className="mb-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-borda px-3 py-1 rotulo-dado text-texto-suave">
            <ShieldCheck size={14} aria-hidden /> Declaração de auditoria
          </span>
          <h1 className="mt-3 font-serif text-2xl font-bold uppercase leading-tight tracking-wide">
            Lançamento da auditoria do turno
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-texto-suave">
            Um lançamento por policial, por data e por turno. Informe o identificador de cada
            gravação auditada — é ele que prova a auditoria e o que o Comando confere.
          </p>
        </div>

        <FormularioLancamento identificado={identidade?.email ?? null} />

        <div className="mt-8 border-t border-borda pt-5">
          {/* Vocabulário do Comando: o que o Portal pode afirmar com honestidade
              é a declaração e o momento dela — não a existência da mídia. Este
              texto acompanha TODA superfície que exporta o dado. */}
          <p className="text-[12px] leading-relaxed text-texto-suave">
            Identificadores informados pelo próprio auditor. O Portal registra a declaração e o
            momento em que ela foi feita; não confirma, por si, a existência da mídia na plataforma
            nem a realização da auditoria.
          </p>
          <Link
            href="/cop2026"
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-borda px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide text-texto-suave hover:border-vermelho/40 hover:text-vermelho"
          >
            <ArrowLeft size={14} aria-hidden /> Voltar à página da COP
          </Link>
        </div>
      </main>

      <RodapeCop largura="max-w-3xl" />
    </div>
  );
}
