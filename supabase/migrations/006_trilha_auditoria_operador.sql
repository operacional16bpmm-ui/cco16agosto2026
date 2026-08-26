-- ============================================================================
-- CCO-16 — Migration 006: trilha de auditoria com operador identificável.
-- Corrige "audit_events sem autor": os triggers de auditoria (migration 002)
-- gravam user_id = auth.uid(), mas este app usa login simples por cookie
-- (lib/auth-simples.ts), não Supabase Auth — auth.uid() é sempre NULL nas
-- escritas feitas pelas server actions (via service-role). Em vez de mudar
-- o modelo de auth, guardamos o operador como texto legível nas próprias
-- linhas (mesmo padrão já usado em despachos.cadeia_cfp).
--
-- alertas_placa não tinha NENHUM trigger de auditoria (a RPC
-- confirmar_alerta_placa da migration 002 nunca é chamada pelo app — exige
-- auth.uid()/is_operational_member(), incompatíveis com o login simples).
-- confirmarAlertaAction passa a gravar confirmado_por_usuario e inserir
-- explicitamente em audit_events com o operador em `details`.
--
-- Aplicada diretamente no projeto lypxujjyllmibxqvdogr em 19/07/2026 via MCP
-- Supabase (nome remoto: trilha_auditoria_operador); este arquivo espelha o
-- SQL aplicado para o repositório voltar a ser fonte de verdade.
-- ============================================================================

alter table public.alertas_placa
  add column if not exists confirmado_por_usuario text;

alter table public.cameras
  add column if not exists criado_por_usuario text;
