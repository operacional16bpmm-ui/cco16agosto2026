import Link from "next/link";
import { ShieldCheck } from "lucide-react";

/**
 * O botão de ADMINISTRAÇÃO da COP — um só, em todas as telas.
 *
 * Antes se chamava "Autorizados" e existia em dois lugares com marcação
 * copiada: no cabeçalho do painel e no rodapé do briefing. O nome mentia desde
 * o dia em que a administração deixou de ser uma tela — hoje são cinco
 * (Autorizados, Lançamentos, Auditores, Metas e Importar) —, e quem procurava
 * "onde eu importo a planilha" não achava atrás de uma palavra que fala de
 * lista de e-mail.
 *
 * Quem vê: só quem `ehAdminCop()` aprova, isto é, quem está em `COP2026_ADMINS`.
 * E VER O BOTÃO NÃO É O CONTROLE DE ACESSO — é só cortesia de navegação. Quem
 * digitar `/cop2026/admin` sem estar na lista leva 404 de `exigirAdminCop()`,
 * e cada server action rechega por conta própria. Esconder botão nunca
 * protegeu rota nenhuma; a proteção está nos três lugares, e esta é a camada
 * que menos importa.
 */
export function BotaoAdmin({
  ehAdmin,
  className = "",
}: {
  ehAdmin: boolean;
  className?: string;
}) {
  if (!ehAdmin) return null;
  return (
    <Link
      href="/cop2026/admin"
      title="Administração da Auditoria de COP"
      className={`inline-flex items-center gap-1 rounded-md border border-ouro/40 bg-ouro/10 px-2.5 py-1 text-[12px] font-semibold text-ouro transition-colors hover:bg-ouro/20 ${className}`}
    >
      <ShieldCheck className="h-3.5 w-3.5" />
      <span>Admin</span>
    </Link>
  );
}
