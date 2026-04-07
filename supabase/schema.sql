-- 1. Tabela de perfis de usuário
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  nome text not null,
  email text not null,
  role text not null check (role in ('colaborador', 'gestor')),
  created_at timestamptz default now()
);

-- 2. Tabela de veículos (Base_Frota)
create table if not exists vehicles (
  id uuid default gen_random_uuid() primary key,
  placa text not null unique,
  tipo_veiculo text not null,
  motorista text,
  cpf_motorista text,
  modelo text,
  seguradora text,
  apolice text,
  inclusao date,
  proprietario text,
  tipo_proprietario text,
  cc text,
  situacao text default 'Ativo',
  ano_fabricacao integer,
  ano_modelo integer,
  numero_frota text,
  chassi text,
  renavam text,
  tipo_seguro text,
  franquia numeric,
  mensal numeric,
  km_atual numeric default 0,
  data_km_atual date,
  cidade text,
  estado text default 'SC',
  cargo text,
  funcao text,
  situacao_motorista text,
  responsavel_manutencao text,
  removido_frota_em date,
  tracao_4x4 boolean default false,
  cor text,
  created_at timestamptz default now()
);

-- 3. Tabela de checklists
create table if not exists checklists (
  id uuid default gen_random_uuid() primary key,
  vehicle_id uuid references vehicles(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete set null,
  km_atual numeric not null,
  status text default 'pendente' check (status in ('pendente', 'aprovado', 'reprovado')),
  observacao text,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

-- 4. Tabela de fotos do checklist
create table if not exists checklist_photos (
  id uuid default gen_random_uuid() primary key,
  checklist_id uuid references checklists(id) on delete cascade not null,
  tipo text not null,
  url text not null,
  created_at timestamptz default now()
);

-- 5. Tabela de itens/respostas do checklist
create table if not exists checklist_items (
  id uuid default gen_random_uuid() primary key,
  checklist_id uuid references checklists(id) on delete cascade not null,
  pergunta text not null,
  resposta boolean not null,
  created_at timestamptz default now()
);

-- 6. Trigger: criação automática de profile ao registrar usuário
-- Quando um usuário é criado via supabase.auth.signUp(), o Supabase
-- insere em auth.users mas NÃO cria o profile. Este trigger resolve isso.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'colaborador')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 7. Índices para performance
create index if not exists idx_checklists_vehicle_id on checklists(vehicle_id);
create index if not exists idx_checklists_user_id on checklists(user_id);
create index if not exists idx_checklists_status on checklists(status);
create index if not exists idx_checklists_created_at on checklists(created_at desc);
create index if not exists idx_checklist_photos_checklist_id on checklist_photos(checklist_id);
create index if not exists idx_checklist_items_checklist_id on checklist_items(checklist_id);
create index if not exists idx_vehicles_placa on vehicles(placa);
create index if not exists idx_vehicles_situacao on vehicles(situacao);
