-- ============================================================================
-- 033 — O 4.BPM/M faltava no CPA/M-5
-- ============================================================================
-- Aplicada no Supabase em 08/09/2026 via MCP (projeto lypxujjyllmibxqvdogr).
--
-- A árvore de unidades nasceu na migration 029 derivada do DEJEM: o CPA/M-5
-- saiu com 16, 23 e 49 BPM/M. O Fabricio (16.BPM/M) apontou em 08/09/2026 que
-- o **4.BPM/M também é do CPA/M-5** e não aparecia no seletor de "Lançar
-- auditoria" — quem é do 4º não tinha como lançar.
--
-- Código: 505 (CPA/M-5) + 04 = 50504, o mesmo esquema de 50516/50523/50549.
--
-- FRAÇÕES: entram só as SEIS que a Matriz Proporcional conta (subunidade_painel
-- 1cia..4cia, ft, em), no mesmo padrão de nome do 16º e do 23º. As frações
-- administrativas (…ADM, …CGP, EM P/1..P/5, SEC PJMD) NÃO foram inventadas —
-- o quadro real do 4º não veio do DEJEM. Quando o Comando mandar a relação,
-- completar aqui; um batalhão sem fração some da tela sem mensagem nenhuma
-- (seletor-unidade.tsx só renderiza a grade se houver fração).
-- ----------------------------------------------------------------------------

insert into public.cop_unidade (cod, tipo, nome, nome_curto, cod_pai, ativa, subunidade_painel) values
  ('50504',     'batalhao', '4.BPM/M',                      '4.BPM/M',              '505',   true, null),
  ('505041000', 'fracao',   '4.BPM/M 1.CIA PM TERRITORIAL', '1.CIA PM TERRITORIAL', '50504', true, '1cia'),
  ('505042000', 'fracao',   '4.BPM/M 2.CIA PM TERRITORIAL', '2.CIA PM TERRITORIAL', '50504', true, '2cia'),
  ('505043000', 'fracao',   '4.BPM/M 3.CIA PM TERRITORIAL', '3.CIA PM TERRITORIAL', '50504', true, '3cia'),
  ('505044000', 'fracao',   '4.BPM/M 4.CIA PM TERRITORIAL', '4.CIA PM TERRITORIAL', '50504', true, '4cia'),
  ('505047000', 'fracao',   '4.BPM/M CIA F TAT',            'CIA F TAT',            '50504', true, 'ft'),
  ('505048000', 'fracao',   '4.BPM/M EM',                   'EM',                   '50504', true, 'em')
on conflict (cod) do nothing;
