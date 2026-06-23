-- ============================================================
--  GESTOR FINANCEIRO — Schema Supabase (v3 — idempotente)
--  Execute no SQL Editor do projeto:
--  https://supabase.com/dashboard/project/iehuwakiloottbyrnsqd/sql
--
--  BANCO JÁ EXISTENTE? Use supabase_migration_v2.sql em vez deste.
--  Este arquivo é para instalações NOVAS (banco limpo).
--
--  ORDEM OBRIGATÓRIA:
--  extensões → tabelas → RLS → triggers → indexes → funções
-- ============================================================

create extension if not exists "uuid-ossp";


-- ============================================================
-- 1. PERFIS DE USUÁRIO
--    Estende auth.users com nome, username e dados de assinatura.
--    Criado automaticamente pelo trigger on_auth_user_created.
-- ============================================================
create table if not exists public.user_profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  nome                   text not null,
  username               text unique not null,
  email                  text,
  assinatura_status      text not null default 'teste'
                           check (assinatura_status in ('ativa','teste','expirada','cancelada')),
  assinatura_plano       text not null default 'basico'
                           check (assinatura_plano in ('basico','profissional','enterprise')),
  assinatura_expira_em   timestamptz,
  assinatura_observacoes text,
  assinatura_criada_em   timestamptz default now(),
  is_admin               boolean default false,
  created_at             timestamptz default now()
);

-- ============================================================
-- 2. PESSOAS
-- ============================================================
create table if not exists public.pessoas (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  nome        text not null,
  tipo        text not null check (tipo in ('cliente','fornecedor','ambos')),
  telefone    text,
  email       text,
  cpf_cnpj    text,
  endereco    text,
  cidade      text,
  estado      text,
  cep         text,
  observacoes text,
  ativa       boolean default true,
  created_at  timestamptz default now()
);

-- ============================================================
-- 3. FONTES DE RENDA — CATEGORIAS
-- ============================================================
create table if not exists public.fonte_renda_categorias (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  nome        text not null,
  descricao   text,
  cor         text not null default '#6366f1',
  ativa       boolean default true,
  created_at  timestamptz default now()
);

-- ============================================================
-- 4. PRODUTOS
-- ============================================================
create table if not exists public.produtos (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  nome           text not null,
  fonte_renda_id uuid references public.fonte_renda_categorias(id) on delete set null,
  descricao      text,
  preco_base     numeric(12,2),
  ativo          boolean default true,
  created_at     timestamptz default now()
);

-- ============================================================
-- 5. CONTAS BANCÁRIAS
-- ============================================================
create table if not exists public.contas_bancarias (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  nome       text not null,
  banco      text not null,
  agencia    text,
  conta      text,
  tipo       text not null check (tipo in ('corrente','poupanca','investimento','carteira')),
  saldo      numeric(12,2) default 0,
  fonte      text not null default 'pessoal' check (fonte in ('empresa','pessoal')),
  ativa      boolean default true,
  cor        text default '#6366f1',
  created_at timestamptz default now()
);

-- ============================================================
-- 6. CONTAS A PAGAR
-- ============================================================
create table if not exists public.contas_pagar (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  descricao      text not null,
  valor          numeric(12,2) not null,
  vencimento     date not null,
  status         text not null default 'pendente'
                   check (status in ('pendente','pago','vencido','parcial')),
  grupo          text not null
                   check (grupo in (
                     'casa','carro','viagens','alimentacao','saude',
                     'educacao','lazer','outros',
                     'reserva_emergencia','aposentadoria','divida'
                   )),
  fonte          text not null check (fonte in ('empresa','pessoal')),
  categoria      text,
  fornecedor     text,
  parcelas       int,
  parcela_atual  int,
  observacoes    text,
  data_pagamento date,
  valor_pago     numeric(12,2),
  prioridade     text default 'media' check (prioridade in ('alta','media','baixa')),
  mes_referencia int  check (mes_referencia between 1 and 12),
  ano_referencia int,
  origem         text default 'manual'
                   check (origem in ('manual','planejamento','divida','carryover','recorrente')),
  origem_id      uuid,
  fonte_renda_id uuid references public.fonte_renda_categorias(id) on delete set null,
  pessoa_id      uuid references public.pessoas(id) on delete set null,
  recorrente     boolean default false,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ============================================================
-- 7. CONTAS A RECEBER
-- ============================================================
create table if not exists public.contas_receber (
  id                         uuid primary key default uuid_generate_v4(),
  user_id                    uuid not null references auth.users(id) on delete cascade,
  descricao                  text not null,
  valor                      numeric(12,2) not null,
  vencimento                 date not null,
  status                     text not null default 'pendente'
                               check (status in ('pendente','pago','vencido','parcial')),
  fonte                      text not null default 'empresa' check (fonte in ('empresa','pessoal')),
  cliente                    text,
  categoria                  text,
  parcelas                   int,
  parcela_atual              int,
  observacoes                text,
  data_recebimento           date,
  valor_recebido             numeric(12,2),
  prioridade                 text default 'media' check (prioridade in ('alta','media','baixa')),
  mes_referencia             int  check (mes_referencia between 1 and 12),
  ano_referencia             int,
  pessoa_id                  uuid references public.pessoas(id) on delete set null,
  produto_id                 uuid references public.produtos(id) on delete set null,
  fonte_renda_id             uuid references public.fonte_renda_categorias(id) on delete set null,
  conta_bancaria_recebida_id uuid references public.contas_bancarias(id) on delete set null,
  dia_pagamento              int,
  created_at                 timestamptz default now(),
  updated_at                 timestamptz default now()
);

-- ============================================================
-- 8. PAGAMENTOS RECEBIDOS (sub-tabela de contas_receber)
-- ============================================================
create table if not exists public.pagamentos_recebidos (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  conta_receber_id  uuid not null references public.contas_receber(id) on delete cascade,
  data              date not null,
  valor             numeric(12,2) not null,
  conta_bancaria_id uuid references public.contas_bancarias(id) on delete set null,
  observacoes       text,
  created_at        timestamptz default now()
);

-- ============================================================
-- 9. TRANSAÇÕES BANCÁRIAS
-- ============================================================
create table if not exists public.transacoes_bancarias (
  id                 uuid primary key default uuid_generate_v4(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  data               date not null,
  descricao          text not null,
  valor              numeric(12,2) not null,
  tipo               text not null check (tipo in ('credito','debito')),
  conta_id           uuid references public.contas_bancarias(id) on delete set null,
  conciliado         boolean default false,
  status_conciliacao text default 'pendente'
                       check (status_conciliacao in ('conciliado','pendente','divergente')),
  banco              text,
  categoria          text,
  created_at         timestamptz default now()
);

-- ============================================================
-- 10. DÍVIDAS
-- ============================================================
create table if not exists public.dividas (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  descricao       text not null,
  credor          text not null,
  pessoa_id       uuid references public.pessoas(id) on delete set null,
  valor_original  numeric(12,2) not null,
  valor_atual     numeric(12,2) not null,
  taxa_juros      numeric(8,4) default 0,
  data_inicio     date not null,
  data_vencimento date not null,
  status          text not null default 'ativa'
                    check (status in ('ativa','quitada','renegociada')),
  fonte           text not null default 'pessoal' check (fonte in ('empresa','pessoal')),
  grupo           text not null default 'divida'
                    check (grupo in (
                      'casa','carro','viagens','alimentacao','saude',
                      'educacao','lazer','outros',
                      'reserva_emergencia','aposentadoria','divida'
                    )),
  parcelas        int not null,
  parcela_atual   int not null default 1,
  valor_parcela   numeric(12,2) not null,
  observacoes     text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Se o schema já foi aplicado, rodar este ALTER para adicionar a coluna:
-- alter table public.dividas add column if not exists grupo text not null default 'divida'
--   check (grupo in ('casa','carro','viagens','alimentacao','saude','educacao','lazer','outros','reserva_emergencia','aposentadoria','divida'));

-- ============================================================
-- 11. HISTÓRICO DE PAGAMENTOS DE DÍVIDA
-- ============================================================
create table if not exists public.pagamentos_divida (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  divida_id   uuid not null references public.dividas(id) on delete cascade,
  data        date not null,
  valor       numeric(12,2) not null,
  observacoes text,
  created_at  timestamptz default now()
);

-- ============================================================
-- 12. PLANEJAMENTOS
-- ============================================================
create table if not exists public.planejamentos (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  nome          text not null,
  tipo          text not null
                  check (tipo in ('reserva_emergencia','compra_carro','viagem','aposentadoria','outros')),
  descricao     text,
  valor_meta    numeric(12,2) not null,
  valor_atual   numeric(12,2) default 0,
  data_inicio   date not null,
  data_alvo     date not null,
  aporte_mensal numeric(12,2) not null,
  fonte         text not null default 'pessoal' check (fonte in ('empresa','pessoal')),
  ativo         boolean default true,
  cor           text default '#6366f1',
  icone         text default '🎯',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- 13. HISTÓRICO DE APORTES DO PLANEJAMENTO
-- ============================================================
create table if not exists public.aportes_planejamento (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  planejamento_id uuid not null references public.planejamentos(id) on delete cascade,
  data            date not null,
  valor           numeric(12,2) not null,
  observacoes     text,
  created_at      timestamptz default now()
);

-- ============================================================
-- 14. FONTES DE RENDA (registros individuais)
-- ============================================================
create table if not exists public.fontes_renda (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  nome          text not null,
  tipo          text not null check (tipo in ('empresa','pessoal')),
  valor         numeric(12,2) not null,
  recorrente    boolean default true,
  periodicidade text default 'mensal'
                  check (periodicidade in ('mensal','semanal','quinzenal','anual','unico')),
  ativa         boolean default true,
  data_inicio   date not null,
  descricao     text,
  categoria     text,
  created_at    timestamptz default now()
);

-- ============================================================
-- 15. PROVISIONAMENTOS
-- ============================================================
create table if not exists public.provisionamentos (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  descricao   text not null,
  tipo        text not null check (tipo in ('faturamento','despesa')),
  fonte       text not null check (fonte in ('empresa','pessoal')),
  valor       numeric(12,2) not null,
  mes         int not null check (mes between 1 and 12),
  ano         int not null,
  realizado   numeric(12,2) default 0,
  status      text default 'previsto' check (status in ('previsto','parcial','realizado')),
  categoria   text,
  created_at  timestamptz default now()
);

-- ============================================================
-- 16. MESES FECHADOS
-- ============================================================
create table if not exists public.meses_fechados (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  mes              int not null check (mes between 1 and 12),
  ano              int not null,
  fechado_em       timestamptz default now(),
  total_pendente   numeric(12,2) default 0,
  contas_carryover int default 0,
  unique (user_id, mes, ano)
);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
--
--  REVISÃO DE ISOLAMENTO:
--  • Todas as 16 tabelas têm RLS habilitado.
--  • Políticas separadas para SELECT/INSERT/UPDATE/DELETE.
--  • INSERT usa "with check" explícito → impede que o código
--    insira um registro com user_id de outro usuário.
--  • UPDATE valida tanto a linha existente (using) quanto a
--    nova linha (with check) → impede que alguém mude o
--    user_id de um registro para outro usuário.
--  • Deletar auth.users em cascata elimina todos os dados do
--    usuário em todas as tabelas.
-- ============================================================

alter table public.user_profiles          enable row level security;
alter table public.pessoas                enable row level security;
alter table public.fonte_renda_categorias enable row level security;
alter table public.produtos               enable row level security;
alter table public.contas_bancarias       enable row level security;
alter table public.contas_pagar           enable row level security;
alter table public.contas_receber         enable row level security;
alter table public.pagamentos_recebidos   enable row level security;
alter table public.transacoes_bancarias   enable row level security;
alter table public.dividas                enable row level security;
alter table public.pagamentos_divida      enable row level security;
alter table public.planejamentos          enable row level security;
alter table public.aportes_planejamento   enable row level security;
alter table public.fontes_renda           enable row level security;
alter table public.provisionamentos       enable row level security;
alter table public.meses_fechados         enable row level security;

-- Macro que gera as 4 políticas por tabela
-- (executada inline para cada tabela abaixo)

-- user_profiles (chave = id, não user_id)
create policy "profile_select" on public.user_profiles
  for select using (auth.uid() = id);
create policy "profile_insert" on public.user_profiles
  for insert with check (auth.uid() = id);
create policy "profile_update" on public.user_profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profile_delete" on public.user_profiles
  for delete using (auth.uid() = id);

-- Admin pode ver e atualizar qualquer perfil
create policy "admin_profile_select" on public.user_profiles
  for select using (
    exists (select 1 from public.user_profiles where id = auth.uid() and is_admin = true)
  );
create policy "admin_profile_update" on public.user_profiles
  for update using (
    exists (select 1 from public.user_profiles where id = auth.uid() and is_admin = true)
  ) with check (
    exists (select 1 from public.user_profiles where id = auth.uid() and is_admin = true)
  );

-- pessoas
create policy "pessoas_select" on public.pessoas
  for select using (auth.uid() = user_id);
create policy "pessoas_insert" on public.pessoas
  for insert with check (auth.uid() = user_id);
create policy "pessoas_update" on public.pessoas
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pessoas_delete" on public.pessoas
  for delete using (auth.uid() = user_id);

-- fonte_renda_categorias
create policy "frc_select" on public.fonte_renda_categorias
  for select using (auth.uid() = user_id);
create policy "frc_insert" on public.fonte_renda_categorias
  for insert with check (auth.uid() = user_id);
create policy "frc_update" on public.fonte_renda_categorias
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "frc_delete" on public.fonte_renda_categorias
  for delete using (auth.uid() = user_id);

-- produtos
create policy "produtos_select" on public.produtos
  for select using (auth.uid() = user_id);
create policy "produtos_insert" on public.produtos
  for insert with check (auth.uid() = user_id);
create policy "produtos_update" on public.produtos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "produtos_delete" on public.produtos
  for delete using (auth.uid() = user_id);

-- contas_bancarias
create policy "cb_select" on public.contas_bancarias
  for select using (auth.uid() = user_id);
create policy "cb_insert" on public.contas_bancarias
  for insert with check (auth.uid() = user_id);
create policy "cb_update" on public.contas_bancarias
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cb_delete" on public.contas_bancarias
  for delete using (auth.uid() = user_id);

-- contas_pagar
create policy "cp_select" on public.contas_pagar
  for select using (auth.uid() = user_id);
create policy "cp_insert" on public.contas_pagar
  for insert with check (auth.uid() = user_id);
create policy "cp_update" on public.contas_pagar
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cp_delete" on public.contas_pagar
  for delete using (auth.uid() = user_id);

-- contas_receber
create policy "cr_select" on public.contas_receber
  for select using (auth.uid() = user_id);
create policy "cr_insert" on public.contas_receber
  for insert with check (auth.uid() = user_id);
create policy "cr_update" on public.contas_receber
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cr_delete" on public.contas_receber
  for delete using (auth.uid() = user_id);

-- pagamentos_recebidos
create policy "pr_select" on public.pagamentos_recebidos
  for select using (auth.uid() = user_id);
create policy "pr_insert" on public.pagamentos_recebidos
  for insert with check (auth.uid() = user_id);
create policy "pr_update" on public.pagamentos_recebidos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pr_delete" on public.pagamentos_recebidos
  for delete using (auth.uid() = user_id);

-- transacoes_bancarias
create policy "tb_select" on public.transacoes_bancarias
  for select using (auth.uid() = user_id);
create policy "tb_insert" on public.transacoes_bancarias
  for insert with check (auth.uid() = user_id);
create policy "tb_update" on public.transacoes_bancarias
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tb_delete" on public.transacoes_bancarias
  for delete using (auth.uid() = user_id);

-- dividas
create policy "div_select" on public.dividas
  for select using (auth.uid() = user_id);
create policy "div_insert" on public.dividas
  for insert with check (auth.uid() = user_id);
create policy "div_update" on public.dividas
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "div_delete" on public.dividas
  for delete using (auth.uid() = user_id);

-- pagamentos_divida
create policy "pd_select" on public.pagamentos_divida
  for select using (auth.uid() = user_id);
create policy "pd_insert" on public.pagamentos_divida
  for insert with check (auth.uid() = user_id);
create policy "pd_update" on public.pagamentos_divida
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pd_delete" on public.pagamentos_divida
  for delete using (auth.uid() = user_id);

-- planejamentos
create policy "plan_select" on public.planejamentos
  for select using (auth.uid() = user_id);
create policy "plan_insert" on public.planejamentos
  for insert with check (auth.uid() = user_id);
create policy "plan_update" on public.planejamentos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "plan_delete" on public.planejamentos
  for delete using (auth.uid() = user_id);

-- aportes_planejamento
create policy "ap_select" on public.aportes_planejamento
  for select using (auth.uid() = user_id);
create policy "ap_insert" on public.aportes_planejamento
  for insert with check (auth.uid() = user_id);
create policy "ap_update" on public.aportes_planejamento
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ap_delete" on public.aportes_planejamento
  for delete using (auth.uid() = user_id);

-- fontes_renda
create policy "fr_select" on public.fontes_renda
  for select using (auth.uid() = user_id);
create policy "fr_insert" on public.fontes_renda
  for insert with check (auth.uid() = user_id);
create policy "fr_update" on public.fontes_renda
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fr_delete" on public.fontes_renda
  for delete using (auth.uid() = user_id);

-- provisionamentos
create policy "prov_select" on public.provisionamentos
  for select using (auth.uid() = user_id);
create policy "prov_insert" on public.provisionamentos
  for insert with check (auth.uid() = user_id);
create policy "prov_update" on public.provisionamentos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "prov_delete" on public.provisionamentos
  for delete using (auth.uid() = user_id);

-- meses_fechados
create policy "mf_select" on public.meses_fechados
  for select using (auth.uid() = user_id);
create policy "mf_insert" on public.meses_fechados
  for insert with check (auth.uid() = user_id);
create policy "mf_update" on public.meses_fechados
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mf_delete" on public.meses_fechados
  for delete using (auth.uid() = user_id);


-- ============================================================
-- TRIGGERS: updated_at automático
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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


-- ============================================================
-- TRIGGER: cria user_profile automaticamente no signup
--    O app passa { data: { nome, username } } no signUp.
-- ============================================================
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- TRIGGER: confirma email automaticamente no signup
--    Necessário para o app funcionar sem configurar SMTP.
--    Em produção com SMTP configurado, remova este trigger.
-- ============================================================
create or replace function public.auto_confirm_email()
returns trigger language plpgsql security definer as $$
begin
  new.email_confirmed_at = coalesce(new.email_confirmed_at, now());
  return new;
end;
$$;

drop trigger if exists auto_confirm_email_trigger on auth.users;
create trigger auto_confirm_email_trigger
  before insert on auth.users
  for each row execute function public.auto_confirm_email();

-- Confirma usuários que já existem sem confirmação
update auth.users
  set email_confirmed_at = now()
  where email_confirmed_at is null;


-- ============================================================
-- ÍNDICES: performance em queries frequentes
-- ============================================================

create index idx_cp_user_mes     on public.contas_pagar(user_id, mes_referencia, ano_referencia);
create index idx_cp_status       on public.contas_pagar(user_id, status);
create index idx_cp_grupo        on public.contas_pagar(user_id, grupo);
create index idx_cp_fonte_renda  on public.contas_pagar(user_id, fonte_renda_id);
create index idx_cp_pessoa       on public.contas_pagar(user_id, pessoa_id);
create index idx_cp_vencimento   on public.contas_pagar(user_id, vencimento);

create index idx_cr_user_mes     on public.contas_receber(user_id, mes_referencia, ano_referencia);
create index idx_cr_status       on public.contas_receber(user_id, status);
create index idx_cr_fonte_renda  on public.contas_receber(user_id, fonte_renda_id);
create index idx_cr_pessoa       on public.contas_receber(user_id, pessoa_id);
create index idx_cr_vencimento   on public.contas_receber(user_id, vencimento);

create index idx_pag_rec_conta   on public.pagamentos_recebidos(conta_receber_id);
create index idx_pag_div_divida  on public.pagamentos_divida(divida_id);
create index idx_aportes_plan    on public.aportes_planejamento(planejamento_id);

create index idx_div_user_status on public.dividas(user_id, status);
create index idx_plan_user       on public.planejamentos(user_id, ativo);

create index idx_tb_user_data    on public.transacoes_bancarias(user_id, data);
create index idx_tb_conta        on public.transacoes_bancarias(user_id, conta_id);

create index idx_prov_user_mes   on public.provisionamentos(user_id, mes, ano);


-- ============================================================
-- FUNÇÕES ADMIN
--
--  SEGURANÇA: chamadas apenas por usuários autenticados
--  com is_admin = true no user_profiles.
--  O painel admin fará login no Supabase com uma conta admin
--  antes de chamar estas funções.
-- ============================================================

-- Bloqueia acesso anônimo às funções admin
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.auto_confirm_email() from anon, authenticated;

-- Função: lista todos os usuários (requer is_admin = true)
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
  -- Só admins podem listar usuários
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

-- Função: atualizar assinatura (requer is_admin = true)
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

-- Função: promover/rebaixar admin (requer is_admin = true)
create or replace function public.admin_set_admin_flag(
  p_user_id uuid,
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

-- Tornar o primeiro usuário criado administrador automaticamente
-- (útil para o setup inicial do sistema)
create or replace function public.maybe_set_first_admin()
returns trigger language plpgsql security definer as $$
declare
  v_count int;
begin
  select count(*) into v_count from public.user_profiles;
  -- Se for o primeiro usuário, é o dono do sistema → admin
  if v_count = 1 then
    update public.user_profiles set is_admin = true where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_first_user_becomes_admin
  after insert on public.user_profiles
  for each row execute function public.maybe_set_first_admin();


-- ============================================================
-- FIM DO SCHEMA
-- ============================================================
