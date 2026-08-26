import { MapaDoSite } from "@/components/mapa-do-site";

/**
 * Layout do grupo público (vitrine, /16bpmm, /estudos, /cop2026, inventário):
 * não existia — cada página cuidava da própria moldura — e nasceu apenas para
 * pendurar o mapa do site no pé de todas elas de uma vez, sem tocar página a
 * página. As rotas do grupo rolam no documento, então o rodapé entra depois
 * do conteúdo naturalmente.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MapaDoSite />
    </>
  );
}
