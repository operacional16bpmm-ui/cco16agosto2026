-- ============================================================================
-- CCO-16 — Seed de HOMOLOGAÇÃO (dados de exemplo na área do 16º BPM/M)
-- Idempotente: limpa e reinsere as tabelas operacionais de demonstração.
-- Rodar no SQL Editor DEPOIS da migration 002.
-- ============================================================================

delete from public.viatura_posicoes where id is not null;
delete from public.alertas_placa where id is not null;
delete from public.ocorrencias where id is not null;
delete from public.cameras where id is not null;
delete from public.reserva_armas where id is not null;
delete from public.operacoes_especiais where id is not null;
delete from public.viaturas where id is not null;

insert into public.viaturas (prefixo, tipo, cia_id, situacao) values
  ('M-16010', 'radiopatrulha', 1, 'disponivel'),
  ('M-16022', 'radiopatrulha', 2, 'empenhada'),
  ('M-16031', 'radiopatrulha', 3, 'disponivel'),
  ('FT-1601', 'forca_tatica', null, 'disponivel');

insert into public.viatura_posicoes (viatura_id, lat, lng)
select id, p.lat, p.lng from public.viaturas
join (values
  ('M-16010', -23.598, -46.72),
  ('M-16022', -23.61, -46.745),
  ('M-16031', -23.585, -46.71),
  ('FT-1601', -23.62, -46.73)
) as p(prefixo, lat, lng) on p.prefixo = public.viaturas.prefixo;

insert into public.cameras (identificacao, origem, natureza, endereco, lat, lng, tem_ocr, cia_id, status) values
  ('Av. Giovanni Gronchi, 1400', 'comercio', 'privada', 'Av. Giovanni Gronchi, 1400 - Morumbi', -23.616, -46.727, true, 1, 'homologada'),
  ('Ponte do Morumbi', 'muralha', 'publica', 'Ponte Eng. Roberto Rossi Zuccolo', -23.595, -46.715, true, null, 'homologada'),
  ('Terminal Campo Limpo', 'smart_sampa', 'publica', 'Terminal Campo Limpo', -23.638, -46.758, false, null, 'homologada'),
  ('Condomínio Portal do Morumbi', 'condominio', 'privada', 'R. Dr. Laerte Setúbal', -23.606, -46.722, false, 1, 'em_analise');

insert into public.ocorrencias (titulo, origem, natureza, endereco, lat, lng, cia_id, placa, status) values
  ('Veículo roubado — placa MOR-2A18', 'muralha_ocr', 'Roubo de veículo', 'Av. Giovanni Gronchi, 1400', -23.616, -46.727, 1, 'MOR2A18', 'aberta'),
  ('Perturbação do sossego (pancadão)', 'denuncia', 'Perturbação', 'Vila Sônia', -23.6, -46.72, 2, null, 'aberta'),
  ('Disparos de arma de fogo', 'copom', 'Disparo', 'Jd. Colombo', -23.611, -46.746, 3, null, 'em_despacho');

insert into public.reserva_armas (categoria, total, disponiveis, retidas, data_referencia) values
  ('Pistola .40', 120, 96, 4, '2026-07-17'),
  ('Espingarda cal. 12', 20, 18, 0, '2026-07-17'),
  ('Carabina .40', 16, 12, 2, '2026-07-17');

insert into public.operacoes_especiais (nome, tipo, local, cia_id, efetivo_reforco, inicio, status) values
  ('Jogo no Morumbi', 'evento_esportivo', 'Estádio do Morumbi', 1, 60, '2026-07-19T20:00:00-03:00', 'planejada'),
  ('Ato na USP', 'manifestacao', 'Cidade Universitária', 2, 24, '2026-07-17T15:00:00-03:00', 'ativa');

insert into public.alertas_placa (placa, motivo, confianca_ocr, status) values
  ('MOR2A18', 'roubo_furto', 92, 'pendente'),
  ('DTF7K05', 'mandado', 78, 'pendente');
