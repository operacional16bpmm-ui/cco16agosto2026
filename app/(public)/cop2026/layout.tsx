import { ehAdminCop } from "@/lib/cop2026-acesso";
import { identidadeCop } from "@/lib/db/cop2026-autorizados";
import { BarraCop } from "@/components/publico16/cop/barra-cop";

/**
 * Casca do módulo da COP — existe só para a barra de atalhos aparecer em todas
 * as telas, inclusive nas que ainda não foram escritas.
 *
 * Por que no layout e não em cada página: são 19 rotas hoje, com quatro
 * cabeçalhos diferentes (a vitrine, o painel, o formulário e a administração).
 * Colar a barra em cada uma seria pedir que a vigésima lembre — e a vigésima
 * nunca lembra.
 *
 * `identidadeCop()` só lê e confere a assinatura do cookie: não vai ao banco e
 * não decide acesso nenhum. Serve para dois detalhes da barra — mostrar os
 * atalhos de administração a quem administra e oferecer o "Sair" a quem está
 * logado. **O gate continua sendo de cada página** (`exigirAcessoCop`,
 * `exigirAdminCop`): esconder botão nunca foi controle de acesso.
 *
 * Todas as rotas do módulo já são `force-dynamic`, então ler o cookie aqui não
 * tira nenhuma delas de um cache que existisse.
 */
export default async function LayoutCop({ children }: { children: React.ReactNode }) {
  const identidade = await identidadeCop();

  return (
    <>
      <BarraCop ehAdmin={ehAdminCop(identidade?.email)} email={identidade?.email} />
      {children}
    </>
  );
}
