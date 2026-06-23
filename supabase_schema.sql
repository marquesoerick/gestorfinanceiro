-- ============================================================
--  GESTOR FINANCEIRO — Schema Supabase
--  Execute no SQL Editor: https://supabase.com/dashboard/project/iehuwakiloottbyrnsqd/sql
--  Ordem: extensões → tabelas → RLS → triggers → indexes → funções
-- ============================================================

-- Extensão UUID (já vem habilitada no Supabase, mas garantindo)
create extension if not exists "uuid-ossp";


-- ============================================================
-- 1. PERFIS DE USUÁRIO
--    Extensão da tabela auth.users com dados de assinatura
--    Criada automaticamente via trigger no signup
-- ============================================================
create table public.user_profiles (
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
-- 2. PESSOAS (clientes / fornecedores / ambos)
-- ============================================================
create table public.pessoas (
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
--    (Action Max, Empresa B, etc.)
-- ============================================================
create table public.fonte_renda_categorias (
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
create table public.produtos (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  nome             text not null,
  fonte_renda_id   uuid references public.fonte_renda_categorias(id) on delete set null,
  descricao        text,
  preco_base       numeric(12,2),
  ativo            boolean default true,
  created_at       timestamptz default now()
);


-- ============================================================
-- 5. CONTAS BANCÁRIAS
-- ============================================================
create table public.contas_bancarias (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  nome        text not null,
  banco       text not null,
  agencia     text,
  conta       text,
  tipo        text not null check (tipo in ('corrente','poupanca','investimento','carteira')),
  saldo       numeric(12,2) default 0,
  fonte       text not null default 'pessoal' check (fonte in ('empresa','pessoal')),
  ativa       boolean default true,
  cor         text default '#6366f1',
  created_at  timestamptz default now()
);


-- ============================================================
-- 6. CONTAS A PAGAR
-- ============================================================
create table public.contas_pagar (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  descricao        text not null,
  valor            numeric(12,2) not null,
  vencimento       date not null,
  status           text not null default 'pendente'
                     check (status in ('pendente','pago','vencido','parcial')),
  grupo            text not null
                     check (grupo in (
                       'casa','carro','viagens','alimentacao','saude',
                       'educacao','lazer','outros',
                       'reserva_emergencia','aposentadoria','divida'
                     )),
  fonte            text not null check (fonte in ('empresa','pessoal')),
  categoria        text,
  fornecedor       text,
  parcelas         int,
  parcela_atual    int,
  observacoes      text,
  data_pagamento   date,
  valor_pago       numeric(12,2),
  prioridade       text default 'media' check (prioridade in ('alta','media','baixa')),
  mes_referencia   int  check (mes_referencia between 1 and 12),
  ano_referencia   int,
  origem           text default 'manual'
                     check (origem in ('manual','planejamento','divida','carryover','recorrente')),
  origem_id        uuid,
  fonte_renda_id   uuid references public.fonte_renda_categorias(id) on delete set null,
  pessoa_id        uuid references public.pessoas(id) on delete set null,
  recorrente       boolean default false,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);


-- ============================================================
-- 7. CONTAS A RECEBER
-- ============================================================
create table public.contas_receber (
  id                        uuid primary key default uuid_generate_v4(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  descricao                 text not null,
  valor                     numeric(12,2) not null,
  vencimento                date not null,
  status                    text not null default 'pendente'
                              check (status in ('pendente','pago','vencido','parcial')),
  fonte                     text not null default 'empresa' check (fonte in ('empresa','pessoal')),
  cliente                   text,
  categoria                 text,
  parcelas                  int,
  parcela_atual             int,
  observacoes               text,
  data_recebimento          date,
  valor_recebido            numeric(12,2),
  prioridade                text default 'media' check (prioridade in ('alta','media','baixa')),
  mes_referencia            int  check (mes_referencia between 1 and 12),
  ano_referencia            int,
  pessoa_id                 uuid references public.pessoas(id) on delete set null,
  produto_id                uuid references public.produtos(id) on delete set null,
  fonte_renda_id            uuid references public.fonte_renda_categorias(id) on delete set null,
  conta_bancaria_recebida_id uuid references public.contas_bancarias(id) on delete set null,
  dia_pagamento             int,
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);


-- ============================================================
-- 8. PAGAMENTOS RECEBIDOS (sub-tabela de contas_receber)
-- ============================================================
create table public.pagamentos_recebidos (
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
create table public.transacoes_bancarias (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  data                date not null,
  descricao           text not null,
  valor               numeric(12,2) not null,
  tipo                text not null check (tipo in ('credito','debito')),
  conta_id            uuid references public.contas_bancarias(id) on delete set null,
  conciliado          boolean default false,
  status_conciliacao  text default 'pendente'
                        check (status_conciliacao in ('conciliado','pendente','divergente')),
  banco               text,
  categoria           text,
  created_at          timestamptz default now()
);


-- ============================================================
-- 10. DÍVIDAS
-- ============================================================
create table public.dividas (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  descricao        text not null,
  credor           text not null,
  pessoa_id        uuid references public.pessoas(id) on delete set null,
  valor_original   numeric(12,2) not null,
  valor_atual      numeric(12,2) not null,
  taxa_juros       numeric(8,4) default 0,
  data_inicio      date not null,
  data_vencimento  date not null,
  status           text not null default 'ativa'
                     check (status in ('ativa','quitada','renegociada')),
  fonte            text not null default 'pessoal' check (fonte in ('empresa','pessoal')),
  parcelas         int not null,
  parcela_atual    int not null default 1,
  valor_parcela    numeric(12,2) not null,
  observacoes      text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);


-- ============================================================
-- 11. PAGAMENTOS DE DÍVIDA (histórico)
-- ============================================================
create table public.pagamentos_divida (
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
create table public.planejamentos (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  nome           text not null,
  tipo           text not null
                   check (tipo in ('reserva_emergencia','compra_carro','viagem','aposentadoria','outros')),
  descricao      text,
  valor_meta     numeric(12,2) not null,
  valor_atual    numeric(12,2) default 0,
  data_inicio    date not null,
  data_alvo      date not null,
  aporte_mensal  numeric(12,2) not null,
  fonte          text not null default 'pessoal' check (fonte in ('empresa','pessoal')),
  ativo          boolean default true,
  cor            text default '#6366f1',
  icone          text default '🎯',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);


-- ============================================================
-- 13. APORTES DO PLANEJAMENTO (histórico)
-- ============================================================
create table public.aportes_planejamento (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  planejamento_id  uuid not null references public.planejamentos(id) on delete cascade,
  data             date not null,
  valor            numeric(12,2) not null,
  observacoes      text,
  created_at       timestamptz default now()
);


-- ============================================================
-- 14. FONTES DE RENDA (registros individuais de receita)
-- ============================================================
create table public.fontes_renda (
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
-- 15. PROVISIONAMENTOS (orçamento previsto)
-- ============================================================
create table public.provisionamentos (
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
create table public.meses_fechados (
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
--    Cada usuário só acessa os próprios dados.
--    O painel admin usa a service_role key (bypassa RLS).
-- ============================================================

alter table public.user_profiles         enable row level security;
alter table public.pessoas               enable row level security;
alter table public.fonte_renda_categorias enable row level security;
alter table public.produtos              enable row level security;
alter table public.contas_bancarias      enable row level security;
alter table public.contas_pagar          enable row level security;
alter table public.contas_receber        enable row level security;
alter table public.pagamentos_recebidos  enable row level security;
alter table public.transacoes_bancarias  enable row level security;
alter table public.dividas               enable row level security;
alter table public.pagamentos_divida     enable row level security;
alter table public.planejamentos         enable row level security;
alter table public.aportes_planejamento  enable row level security;
alter table public.fontes_renda          enable row level security;
alter table public.provisionamentos      enable row level security;
alter table public.meses_fechados        enable row level security;

-- Políticas: usuário lê/escreve apenas os próprios dados
create policy "own_profile"                 on public.user_profiles         for all using (auth.uid() = id);
create policy "own_pessoas"                 on public.pessoas                for all using (auth.uid() = user_id);
create policy "own_fonte_renda_categorias"  on public.fonte_renda_categorias  for all using (auth.uid() = user_id);
create policy "own_produtos"                on public.produtos               for all using (auth.uid() = user_id);
create policy "own_contas_bancarias"        on public.contas_bancarias       for all using (auth.uid() = user_id);
create policy "own_contas_pagar"            on public.contas_pagar           for all using (auth.uid() = user_id);
create policy "own_contas_receber"          on public.contas_receber         for all using (auth.uid() = user_id);
create policy "own_pagamentos_recebidos"    on public.pagamentos_recebidos   for all using (auth.uid() = user_id);
create policy "own_transacoes_bancarias"    on public.transacoes_bancarias   for all using (auth.uid() = user_id);
create policy "own_dividas"                 on public.dividas                for all using (auth.uid() = user_id);
create policy "own_pagamentos_divida"       on public.pagamentos_divida      for all using (auth.uid() = user_id);
create policy "own_planejamentos"           on public.planejamentos          for all using (auth.uid() = user_id);
create policy "own_aportes_planejamento"    on public.aportes_planejamento   for all using (auth.uid() = user_id);
create policy "own_fontes_renda"            on public.fontes_renda           for all using (auth.uid() = user_id);
create policy "own_provisionamentos"        on public.provisionamentos       for all using (auth.uid() = user_id);
create policy "own_meses_fechados"          on public.meses_fechados         for all using (auth.uid() = user_id);


-- ============================================================
-- TRIGGERS: atualiza updated_at automaticamente
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_contas_pagar_updated_at
  before update on public.contas_pagar
  for each row execute function public.set_updated_at();

create trigger trg_contas_receber_updated_at
  before update on public.contas_receber
  for each row execute function public.set_updated_at();

create trigger trg_dividas_updated_at
  before update on public.dividas
  for each row execute function public.set_updated_at();

create trigger trg_planejamentos_updated_at
  before update on public.planejamentos
  for each row execute function public.set_updated_at();


-- ============================================================
-- TRIGGER: cria user_profile automaticamente no signup
--    Os metadados `nome` e `username` são passados pelo app
--    no momento do cadastro via supabase.auth.signUp({ data: { nome, username } })
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (id, nome, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
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
-- ÍNDICES: performance em queries frequentes
-- ============================================================

-- Contas a pagar: filtro mensal (o mais usado)
create index idx_cp_user_mes    on public.contas_pagar(user_id, mes_referencia, ano_referencia);
create index idx_cp_status      on public.contas_pagar(user_id, status);
create index idx_cp_grupo       on public.contas_pagar(user_id, grupo);
create index idx_cp_fonte_renda on public.contas_pagar(user_id, fonte_renda_id);
create index idx_cp_pessoa      on public.contas_pagar(user_id, pessoa_id);
create index idx_cp_vencimento  on public.contas_pagar(user_id, vencimento);

-- Contas a receber
create index idx_cr_user_mes    on public.contas_receber(user_id, mes_referencia, ano_referencia);
create index idx_cr_status      on public.contas_receber(user_id, status);
create index idx_cr_fonte_renda on public.contas_receber(user_id, fonte_renda_id);
create index idx_cr_pessoa      on public.contas_receber(user_id, pessoa_id);
create index idx_cr_vencimento  on public.contas_receber(user_id, vencimento);

-- Sub-tabelas: sempre filtradas pela FK pai
create index idx_pag_rec_conta  on public.pagamentos_recebidos(conta_receber_id);
create index idx_pag_div_divida on public.pagamentos_divida(divida_id);
create index idx_aportes_plan   on public.aportes_planejamento(planejamento_id);

-- Dívidas e planejamentos
create index idx_div_user_status on public.dividas(user_id, status);
create index idx_plan_user       on public.planejamentos(user_id, ativo);

-- Transações bancárias: filtro por data
create index idx_tb_user_data    on public.transacoes_bancarias(user_id, data);
create index idx_tb_conta        on public.transacoes_bancarias(user_id, conta_id);

-- Provisionamentos: filtro mensal
create index idx_prov_user_mes   on public.provisionamentos(user_id, mes, ano);


-- ============================================================
-- FUNÇÃO ADMIN: lista todos os usuários com dados de perfil
--    Chamada com a service_role key (bypassa RLS)
--    Uso: supabase.rpc('admin_list_users') com service_role
-- ============================================================
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
language sql
as $$
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
$$;


-- ============================================================
-- FUNÇÃO ADMIN: atualizar assinatura de um usuário
--    Uso: supabase.rpc('admin_update_assinatura', { ... })
-- ============================================================
create or replace function public.admin_update_assinatura(
  p_user_id            uuid,
  p_status             text,
  p_plano              text,
  p_expira_em          timestamptz default null,
  p_observacoes        text default null
)
returns void
security definer
language sql
as $$
  update public.user_profiles
  set
    assinatura_status    = p_status,
    assinatura_plano     = p_plano,
    assinatura_expira_em = p_expira_em,
    assinatura_observacoes = p_observacoes
  where id = p_user_id;
$$;


-- ============================================================
-- FIM DO SCHEMA
-- ============================================================
