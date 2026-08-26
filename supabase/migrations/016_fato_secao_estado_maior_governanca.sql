-- ----------------------------------------------------------------------------
-- 013_fato_secao_estado_maior_governanca.sql
-- Amplia a CHECK constraint de fato_secao.secao (migration 007) para aceitar
-- 'estado_maior' e 'governanca' — as duas novas páginas /estado-maior e
-- /governanca usam o mesmo framework genérico (fato_secao/agregado_dimensional)
-- de P1/P3/FT, mas o enum original só previa as 9 seções operacionais.
-- ----------------------------------------------------------------------------
alter table public.fato_secao drop constraint if exists fato_secao_secao_check;
alter table public.fato_secao add constraint fato_secao_secao_check
  check (secao in ('p1', 'p2', 'p3', 'p4', 'p5', 'ft', 'motomec', 'res_armas', 'spjmd', 'estado_maior', 'governanca'));
