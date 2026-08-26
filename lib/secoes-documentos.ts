/**
 * Lista de seções que podem receber documentos no painel de Administração
 * (Setor Administrativo → Documentos). Compartilhada entre server e client
 * components — por isso não tem "server-only" e não importa nada do
 * Supabase. Os valores batem com o check constraint de
 * documentos_secoes_visibilidade (migration 017).
 */
export const SECOES_DOCUMENTOS = [
  { valor: "publico", rotulo: "Público (todos)" },
  { valor: "p1", rotulo: "P1 · Pessoal" },
  { valor: "p2", rotulo: "P2 · Inteligência" },
  { valor: "p3", rotulo: "P3 · Operações" },
  { valor: "p4", rotulo: "P4 · Logística" },
  { valor: "comunicacao", rotulo: "P5 · Comunicação" },
  { valor: "spjmd", rotulo: "SPJMD" },
  { valor: "logistica", rotulo: "Logística · Motomec" },
  { valor: "reserva_armas", rotulo: "Reserva de Armas" },
  { valor: "forca_tatica", rotulo: "Força Tática" },
  { valor: "estado_maior", rotulo: "Estado-Maior" },
  // Unidades subordinadas (migration 021): documento endereçado a uma
  // Companhia aparece no painel do comandante dela, em /companhia/[unidade].
  { valor: "cia_1", rotulo: "1ª Companhia" },
  { valor: "cia_2", rotulo: "2ª Companhia" },
  { valor: "cia_3", rotulo: "3ª Companhia" },
  { valor: "cia_4", rotulo: "4ª Companhia" },
  { valor: "cia_ft", rotulo: "Cia de Força Tática" },
] as const;

export type SecaoDocumento = (typeof SECOES_DOCUMENTOS)[number]["valor"];

export function ehSecaoDocumentoValida(valor: string): valor is SecaoDocumento {
  return SECOES_DOCUMENTOS.some((s) => s.valor === valor);
}
