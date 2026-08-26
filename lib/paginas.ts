import { UNIDADES } from "@/lib/unidades";

/**
 * Catálogo das páginas administráveis da Sala de Comando: é a lista que a tela
 * de Usuários e Acessos oferece ao Comando para liberar página a página, e o
 * gabarito que lib/db/permissoes.ts usa para decidir a rota inicial de quem
 * não é Comando. A ordem aqui espelha a navegação lateral de propósito: a
 * primeira rota permitida do catálogo vira o destino pós-login do usuário.
 *
 * Módulo compartilhado entre server e client (a nav filtra itens com
 * rotaEstaPermitida), por isso não tem "server-only" nem importa Supabase.
 *
 * Liberar uma rota libera também as subrotas: '/p4' cobre '/p4/telematica',
 * '/companhia' cobre '/companhia/1'. A regra vive em rotaEstaPermitida, num
 * lugar só. '/administrativo/usuarios' fica FORA do catálogo: a gestão de
 * acessos é sempre e somente do perfil comando, não é concedível.
 */

export type PaginaAdministravel = {
  rota: string;
  rotulo: string;
  grupo: string;
};

export const PAGINAS_ADMINISTRAVEIS: PaginaAdministravel[] = [
  { rota: "/companhia", rotulo: "Todas as Companhias (comparativo)", grupo: "Companhias" },
  ...UNIDADES.map((u) => ({
    rota: `/companhia/${u.valor}`,
    rotulo: u.rotulo,
    grupo: "Companhias",
  })),
  { rota: "/overview", rotulo: "Visão Geral", grupo: "Operação" },
  { rota: "/sala-operacoes", rotulo: "Sala de Operações", grupo: "Operação" },
  { rota: "/despacho", rotulo: "Despacho (CAD)", grupo: "Operação" },
  { rota: "/alertas-placa", rotulo: "Alertas de Placa", grupo: "Operação" },
  { rota: "/operacoes-especiais", rotulo: "Operação Especial", grupo: "Operação" },
  { rota: "/p2", rotulo: "P2 · Inteligência", grupo: "Operação" },
  { rota: "/kpis", rotulo: "KPIs Operacionais", grupo: "Dados & Gestão" },
  { rota: "/boletins", rotulo: "Boletins · BG e BI", grupo: "Dados & Gestão" },
  { rota: "/dejem", rotulo: "DEJEM · Estudo", grupo: "Dados & Gestão" },
  { rota: "/logistica", rotulo: "Logística · MOTOMEC", grupo: "Dados & Gestão" },
  { rota: "/reserva-armas", rotulo: "Reserva de Armas", grupo: "Dados & Gestão" },
  { rota: "/fontes", rotulo: "Frescor das Fontes", grupo: "Dados & Gestão" },
  { rota: "/motor-alertas", rotulo: "Motor de Alertas", grupo: "Dados & Gestão" },
  { rota: "/comunicacao", rotulo: "Comunicação · Reconhecimento", grupo: "Dados & Gestão" },
  { rota: "/administrativo", rotulo: "Setor Administrativo", grupo: "Dados & Gestão" },
  { rota: "/administrativo/documentos", rotulo: "Documentos por Seção", grupo: "Dados & Gestão" },
  { rota: "/lgpd-auditoria", rotulo: "LGPD & Auditoria", grupo: "Governança" },
  { rota: "/continuidade", rotulo: "Continuidade", grupo: "Governança" },
  { rota: "/cameras", rotulo: "Câmeras do Território", grupo: "Governança" },
  { rota: "/governanca", rotulo: "Governança · Indicadores", grupo: "Governança" },
  { rota: "/p1", rotulo: "P1 · Pessoal", grupo: "Seções do Batalhão" },
  { rota: "/p3", rotulo: "P3 · Operações", grupo: "Seções do Batalhão" },
  { rota: "/p4", rotulo: "P4 · Logística", grupo: "Seções do Batalhão" },
  { rota: "/forca-tatica", rotulo: "Força Tática", grupo: "Seções do Batalhão" },
  { rota: "/spjmd", rotulo: "SPJMD", grupo: "Seções do Batalhão" },
  { rota: "/estado-maior", rotulo: "Estado-Maior", grupo: "Seções do Batalhão" },
];

/**
 * Rotas de item de navegação que não passam por permissão porque já são
 * públicas por decisão registrada em proxy.ts (qualquer pessoa com o link
 * abre sem login). Esconder da nav não protegeria nada.
 */
export const ROTAS_PUBLICAS_NA_NAV = ["/16bpmminventario", "/cop2026"];

/**
 * De-para entre página administrável e chave de documentos_secoes_visibilidade
 * (lib/secoes-documentos.ts): quem tem a rota liberada também pode baixar
 * documentos endereçados à seção correspondente. Usado por
 * lib/db/permissoes.ts:secoesDocumentoPermitidas para fechar o furo em que
 * qualquer sessão baixava, por id, documento de qualquer seção.
 */
export const ROTA_PARA_SECAO_DOCUMENTO: Record<string, string> = {
  "/p1": "p1",
  "/p2": "p2",
  "/p3": "p3",
  "/p4": "p4",
  "/comunicacao": "comunicacao",
  "/spjmd": "spjmd",
  "/logistica": "logistica",
  "/reserva-armas": "reserva_armas",
  "/forca-tatica": "forca_tatica",
  "/estado-maior": "estado_maior",
  "/companhia/1": "cia_1",
  "/companhia/2": "cia_2",
  "/companhia/3": "cia_3",
  "/companhia/4": "cia_4",
  "/companhia/ft": "cia_ft",
};

export function ehRotaAdministravel(rota: string): boolean {
  return PAGINAS_ADMINISTRAVEIS.some((p) => p.rota === rota);
}

/**
 * Permissão com herança por prefixo: a rota está liberada se ela mesma ou
 * qualquer ancestral de caminho estiver no conjunto ('/p4' libera
 * '/p4/telematica'; '/companhia' libera '/companhia/2').
 */
export function rotaEstaPermitida(
  permitidas: ReadonlySet<string>,
  rota: string
): boolean {
  if (permitidas.has(rota)) return true;
  let atual = rota;
  while (atual.lastIndexOf("/") > 0) {
    atual = atual.slice(0, atual.lastIndexOf("/"));
    if (permitidas.has(atual)) return true;
  }
  return false;
}
