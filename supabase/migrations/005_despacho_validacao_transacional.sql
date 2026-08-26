-- ============================================================================
-- CCO-16 — Migration 005: validação de despacho transacional.
-- Corrige a corrida de dois operadores validando o mesmo despacho em
-- paralelo (achado da auditoria de 19/07/2026): antes validarDespachoAction
-- fazia 3 statements soltos com guarda só no UPDATE da ocorrência — dois
-- operadores em paralelo podiam inserir 2 despachos e empenhar 2 viaturas
-- para a mesma ocorrência (ou a mesma viatura para 2 ocorrências).
-- validar_despacho() executa as 3 escritas dentro de uma única chamada de
-- função: se qualquer guarda de status falhar, a exceção reverte tudo.
-- Aplicada diretamente no projeto lypxujjyllmibxqvdogr em 19/07/2026 via MCP
-- Supabase (nome remoto: despacho_validacao_transacional); este arquivo
-- espelha o SQL aplicado para o repositório voltar a ser fonte de verdade.
-- ============================================================================

create or replace function public.validar_despacho(
  p_ocorrencia_id uuid,
  p_viatura_id uuid,
  p_operador text,
  p_tempo_seg integer default null,
  p_distancia_m integer default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_despacho_id uuid;
begin
  update public.ocorrencias
    set status = 'em_despacho'
    where id = p_ocorrencia_id and status = 'aberta';
  if not found then
    raise exception 'ocorrência % já despachada, encerrada ou inexistente', p_ocorrencia_id
      using errcode = 'P0001';
  end if;

  update public.viaturas
    set situacao = 'empenhada'
    where id = p_viatura_id and situacao = 'disponivel';
  if not found then
    raise exception 'viatura % já empenhada, indisponível ou inexistente', p_viatura_id
      using errcode = 'P0001';
  end if;

  insert into public.despachos(
    ocorrencia_id, viatura_id, status, tempo_deslocamento_seg, distancia_m,
    validado_em, cadeia_cfp
  ) values (
    p_ocorrencia_id, p_viatura_id, 'validado', p_tempo_seg, p_distancia_m,
    now(), p_operador
  )
  returning id into v_despacho_id;

  return v_despacho_id;
end;
$$;

comment on function public.validar_despacho is
  'Valida despacho de viatura para ocorrência de forma atômica (guarda status de ambas). p_operador = usuário do login simples (lib/auth-simples.ts), não auth.uid() — este app não usa Supabase Auth.';
