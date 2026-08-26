import { redirect } from "next/navigation";

/**
 * Rota antiga da Auditoria de COP.
 *
 * O painel foi refeito em /cop2026 (grupo public): lê a planilha do formulário
 * ao vivo, em vez de depender da importação manual de CSV para a tabela
 * cop_auditoria_respostas, que deixava a tela sempre com o dado da última
 * carga. Mantida só para não quebrar link já compartilhado.
 */
export default function AuditoriaCopPage() {
  redirect("/cop2026");
}
