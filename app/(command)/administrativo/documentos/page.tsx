import { FolderCog } from "lucide-react";
import { PageHeader, Badge } from "@/components/command/ui";
import { DocumentosAdminTabela } from "@/components/documentos/documentos-admin-tabela";
import { listarDocumentosComVisibilidade } from "@/lib/db/documentos";
import { exigirPagina } from "@/lib/db/permissoes";

export const metadata = { title: "Documentos por Seção · CCO-16" };
export const dynamic = "force-dynamic";

export default async function DocumentosSecoesPage() {
  await exigirPagina("/administrativo/documentos");
  const documentos = await listarDocumentosComVisibilidade();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        titulo="Documentos por Seção"
        descricao="Envie arquivos (planilhas, ofícios, etc.) e escolha quem vê cada um: público para todo mundo ou restrito a seções específicas."
        acao={
          <Badge tone="neutro">
            <FolderCog size={12} /> {documentos.length} documento(s)
          </Badge>
        }
      />
      <DocumentosAdminTabela documentosIniciais={documentos} />
    </div>
  );
}
