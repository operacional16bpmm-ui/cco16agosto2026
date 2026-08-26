import { KeyRound } from "lucide-react";
import { PageHeader, Badge, Card } from "@/components/command/ui";
import { exigirComando } from "@/lib/db/permissoes";
import { listarUsuarios, type UsuarioAdmin } from "@/lib/db/usuarios";
import { PainelUsuarios } from "./painel-usuarios";

export const metadata = { title: "Usuários e Acessos · CCO-16" };
export const dynamic = "force-dynamic";

/**
 * Gestão de acessos do portal (migration 023). Rota exclusiva do perfil
 * comando: não está no catálogo de lib/paginas.ts de propósito, para não
 * existir a possibilidade de conceder a alguém o poder de conceder acessos.
 */
export default async function UsuariosPage() {
  const sessao = await exigirComando();

  let usuarios: UsuarioAdmin[];
  let erro: string | null = null;
  try {
    usuarios = await listarUsuarios();
  } catch (e) {
    console.error("[usuarios] listar:", e);
    usuarios = [];
    erro = "Não foi possível carregar as contas cadastradas.";
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="Usuários e Acessos"
        descricao="Contas do portal, chaves de acesso e liberação página a página. Cada usuário enxerga somente o que estiver marcado aqui; o perfil Comando é sempre irrestrito."
        acao={
          <Badge tone="attention">
            <KeyRound size={12} /> Exclusivo do Comando
          </Badge>
        }
      />

      {erro ? (
        <Card>
          <p className="text-sm text-vermelho">{erro}</p>
        </Card>
      ) : (
        <PainelUsuarios usuarios={usuarios} operador={sessao.usuario} />
      )}
    </div>
  );
}
