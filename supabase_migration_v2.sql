-- ============================================================
--  GESTOR FINANCEIRO — Migração v2 (incremental / idempotente)
--  Execute no SQL Editor do Supabase se o schema já foi
--  aplicado anteriormente e você recebe erros de "already exists".
--  https://supabase.com/dashboard/project/iehuwakiloottbyrnsqd/sql
-- ============================================================

-- ─── 1. Coluna "grupo" na tabela dividas (nova) ──────────────
alter table public.dividas
  add column if not exists grupo text not null default 'divida'
    check (grupo in (
      'casa','carro','viagens','alimentacao','saude',
      'educacao','lazer','outros',
      'reserva_emergencia','aposentadoria','divida'
    ));


-- ─── 2. Políticas RLS para user_profiles ────────────────────
-- Remove e recria todas para garantir consistência
drop policy if exists "profile_select"       on public.user_profiles;
drop policy if exists "profile_insert"       on public.user_profiles;
drop policy if exists "profile_update"       on public.user_profiles;
drop policy if exists "profile_delete"       on public.user_profiles;
drop policy if exists "admin_profile_select" on public.user_profiles;
drop policy if exists "admin_profile_update" on public.user_profiles;

-- Usuário lê/edita o próprio perfil
create policy "profile_select" on public.user_profiles
  for select using (auth.uid() = id);

create policy "profile_insert" on public.user_profiles
  for insert with check (auth.uid() = id);

create policy "profile_update" on public.user_profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "profile_delete" on public.user_profiles
  for delete using (auth.uid() = id);

-- Admin vê e atualiza qualquer perfil
create policy "admin_profile_select" on public.user_profiles
  for select using (
    exists (select 1 from public.user_profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "admin_profile_update" on public.user_profiles
  for update using (
    exists (select 1 from public.user_profiles p where p.id = auth.uid() and p.is_admin = true)
  ) with check (
    exists (select 1 from public.user_profiles p where p.id = auth.uid() and p.is_admin = true)
  );


-- ─── 3. Funções (CREATE OR REPLACE = idempotente) ────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (id, nome, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome',     split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.auto_confirm_email()
returns trigger language plpgsql security definer as $$
begin
  new.email_confirmed_at = coalesce(new.email_confirmed_at, now());
  return new;
end;
$$;

create or replace function public.maybe_set_first_admin()
returns trigger language plpgsql security definer as $$
declare
  v_count int;
begin
  select count(*) into v_count from public.user_profiles;
  if v_count = 1 then
    update public.user_profiles set is_admin = true where id = new.id;
  end if;
  return new;
end;
$$;

create or replace function public.admin_list_users()
returns table (
  id                   uuid,
  email                text,
  created_at           timestamptz,
  last_sign_in_at      timestamptz,
  nome                 text,
  username             text,
  assinatura_status    text,
  assinatura_plano     text,
  assinatura_expira_em timestamptz,
  is_admin             boolean
)
security definer
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.user_profiles
    where id = auth.uid() and is_admin = true
  ) then
    raise exception 'Acesso negado: somente administradores';
  end if;

  return query
    select
      au.id,
      au.email,
      au.created_at,
      au.last_sign_in_at,
      up.nome,
      up.username,
      up.assinatura_status,
      up.assinatura_plano,
      up.assinatura_expira_em,
      up.is_admin
    from auth.users au
    left join public.user_profiles up on up.id = au.id
    order by au.created_at desc;
end;
$$;

create or replace function public.admin_update_assinatura(
  p_user_id     uuid,
  p_status      text,
  p_plano       text,
  p_expira_em   timestamptz default null,
  p_observacoes text        default null
)
returns void
security definer
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.user_profiles
    where id = auth.uid() and is_admin = true
  ) then
    raise exception 'Acesso negado: somente administradores';
  end if;

  update public.user_profiles
  set
    assinatura_status      = p_status,
    assinatura_plano       = p_plano,
    assinatura_expira_em   = p_expira_em,
    assinatura_observacoes = p_observacoes
  where id = p_user_id;
end;
$$;

create or replace function public.admin_set_admin_flag(
  p_user_id  uuid,
  p_is_admin boolean
)
returns void
security definer
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.user_profiles
    where id = auth.uid() and is_admin = true
  ) then
    raise exception 'Acesso negado: somente administradores';
  end if;

  update public.user_profiles
  set is_admin = p_is_admin
  where id = p_user_id;
end;
$$;


-- ─── 4. Triggers (drop-if-exists + recreate) ─────────────────
drop trigger if exists trg_contas_pagar_upd      on public.contas_pagar;
drop trigger if exists trg_contas_receber_upd    on public.contas_receber;
drop trigger if exists trg_dividas_upd           on public.dividas;
drop trigger if exists trg_planejamentos_upd     on public.planejamentos;
drop trigger if exists on_auth_user_created      on auth.users;
drop trigger if exists auto_confirm_email_trigger on auth.users;
drop trigger if exists on_first_user_becomes_admin on public.user_profiles;

create trigger trg_contas_pagar_upd
  before update on public.contas_pagar
  for each row execute function public.set_updated_at();

create trigger trg_contas_receber_upd
  before update on public.contas_receber
  for each row execute function public.set_updated_at();

create trigger trg_dividas_upd
  before update on public.dividas
  for each row execute function public.set_updated_at();

create trigger trg_planejamentos_upd
  before update on public.planejamentos
  for each row execute function public.set_updated_at();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create trigger auto_confirm_email_trigger
  before insert on auth.users
  for each row execute function public.auto_confirm_email();

create trigger on_first_user_becomes_admin
  after insert on public.user_profiles
  for each row execute function public.maybe_set_first_admin();


-- ─── 5. Confirmar e-mails de usuários já cadastrados ─────────
update auth.users
  set email_confirmed_at = now()
  where email_confirmed_at is null;


-- ─── 6. Marcar primeiro usuário como admin (se não estiver) ──
update public.user_profiles
  set is_admin = true
  where id = (select id from public.user_profiles order by created_at limit 1)
    and is_admin = false;


-- ─── FIM DA MIGRAÇÃO v2 ───────────────────────────────────────
