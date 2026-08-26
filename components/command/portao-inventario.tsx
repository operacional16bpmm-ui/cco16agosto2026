import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, KeyRound, ShieldAlert } from "lucide-react";
import { chaveConfere, liberarInventario } from "@/lib/chave-inventario";

/**
 * Portão de chave da central de Inventário.
 *
 * Uma palavra só, sem usuário: a página é aberta pelo link por qualquer fração
 * e a chave existe para que quem esbarre no endereço não veja a carga do
 * Batalhão. Erro de chave volta pela querystring (?chave=erro), sem estado de
 * cliente, para o portão continuar sendo um componente de servidor.
 */
export function PortaoInventario({ erro }: { erro?: boolean }) {
  async function entrar(dados: FormData) {
    "use server";
    const { redirect } = await import("next/navigation");
    const digitada = String(dados.get("chave") ?? "");
    if (!chaveConfere(digitada)) redirect("/16bpmminventario?chave=erro");
    await liberarInventario();
    redirect("/16bpmminventario");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-branco/10 bg-tatico-super p-8 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/brand/16bpmm.png"
            alt="Brasão do 16º BPM/M"
            width={56}
            height={80}
            className="h-16 w-auto"
            priority
          />
          <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-branco/40">
            16º BPM/M · Levantamento patrimonial
          </p>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight text-branco">
            Inventário 2026
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-branco/55">
            Esta central reúne as planilhas das companhias, da Força Tática e das seções do
            Estado-Maior. Informe a chave de acesso para continuar.
          </p>
        </div>

        <form action={entrar} className="mt-6 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-branco/40">
              Chave de acesso
            </span>
            <span className="relative">
              <KeyRound
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-branco/35"
              />
              <input
                type="password"
                name="chave"
                autoFocus
                autoComplete="off"
                required
                className="w-full rounded-lg border border-branco/15 bg-branco/[0.04] py-3 pl-9 pr-3 text-sm text-branco outline-none focus:border-vermelho/60"
                placeholder="digite a chave"
              />
            </span>
          </label>

          {erro && (
            <p className="flex items-center gap-1.5 rounded-lg border border-vermelho/35 bg-vermelho/[0.08] px-3 py-2 text-xs font-semibold text-vermelho">
              <ShieldAlert size={14} /> Chave incorreta. Confira com o Estado-Maior.
            </p>
          )}

          <button
            type="submit"
            className="rounded-lg bg-vermelho px-4 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.01]"
          >
            Entrar
          </button>
        </form>

        <div className="mt-6 border-t border-branco/10 pt-4 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-branco/45 transition-colors hover:text-vermelho"
          >
            <ArrowLeft size={13} /> Voltar à página institucional
          </Link>
          <p className="mt-2 text-[10px] leading-relaxed text-branco/35">
            Quem tem credencial individual da Sala de Comando também alcança esta central pelo menu,
            sem precisar da chave.
          </p>
        </div>
      </div>
    </main>
  );
}
