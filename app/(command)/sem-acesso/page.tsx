import { KeyRound } from "lucide-react";
import { Card } from "@/components/command/ui";
import { exigirSessaoValida } from "@/lib/db/permissoes";

export const metadata = { title: "Sem páginas liberadas · CCO-16" };
export const dynamic = "force-dynamic";

/**
 * Destino de quem loga sem NENHUMA página liberada em usuarios_paginas
 * (lib/db/permissoes.ts:rotaInicialPermitida). Um aviso claro é melhor que o
 * 404 mudo: a pessoa acabou de receber a chave de acesso e precisa saber que
 * falta o Comando liberar as páginas, não achar que o portal quebrou.
 */
export default async function SemAcessoPage() {
  const sessao = await exigirSessaoValida();

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center pt-16 text-center">
      <Card className="flex flex-col items-center gap-4 px-8 py-10">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ouro/10 text-ouro">
          <KeyRound size={26} strokeWidth={1.75} />
        </span>
        <div>
          <h1 className="text-lg font-extrabold text-branco">
            Acesso registrado, páginas pendentes
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-branco/60">
            {sessao.nome}, sua conta está ativa, mas o Comando ainda não liberou
            nenhuma página da Sala de Comando para o seu usuário. Procure o
            Comando do 16º BPM/M para solicitar a liberação.
          </p>
        </div>
      </Card>
    </div>
  );
}
