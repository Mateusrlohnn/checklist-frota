# 🚛 Frota Check — Sistema de Checklist de Frota

Sistema web para controle e validação de checklist de veículos, com perfis distintos de colaborador e gestor, desenvolvido como solução para o teste técnico de Analista de Sistemas.

---

## 📋 Sobre o projeto

O Frota Check é uma solução para gerenciamento de checklist de frota, permitindo que colaboradores realizem inspeções de veículos com registro de fotos e perguntas objetivas, enquanto gestores acompanham, aprovam ou reprovam os checklists enviados em tempo real.

---

## 🚀 Tecnologias utilizadas

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite |
| Estilização | Tailwind CSS |
| Roteamento | React Router DOM |
| Backend/Banco | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth |
| Storage de fotos | Supabase Storage |
| Tempo real | Supabase Realtime |
| Ícones | Lucide React |
| Automações SQL | pg_cron + PostgreSQL Triggers |

---

## 👥 Perfis de acesso

### Colaborador
- Visualiza apenas os veículos da frota para seleção
- Preenche e envia o checklist com fotos e respostas objetivas
- Não acessa histórico geral nem dados de outros usuários

### Gestor
- Visualiza todos os checklists enviados
- Aprova ou reprova checklists com justificativa
- Consulta histórico por veículo
- Filtra por placa e por status (pendente, aprovado, reprovado)
- Recebe notificações em tempo real ao receber novos checklists

---

## ✅ Checklist — campos obrigatórios

- Data do checklist (gerada automaticamente)
- Identificação do veículo (placa + modelo)
- KM atual
- Identificação do responsável pelo preenchimento

---

## 📸 Fotos obrigatórias

O sistema exige o envio das seguintes fotos antes de permitir o envio:

1. Frente do veículo
2. Lateral do veículo
3. Pneu
4. Parte interna
5. Painel

O envio é bloqueado automaticamente se qualquer foto obrigatória estiver faltando.

---

## ❓ Perguntas objetivas (Sim/Não)

1. Documentação em dia?
2. Equipamentos obrigatórios presentes?
3. Existem avarias visíveis?
4. O veículo está apto para uso?
5. Os pneus aparentam condição adequada?

---

## ⚙️ Automações implementadas

| # | Automação | Tipo |
|---|---|---|
| 1 | Criação automática de perfil ao registrar usuário | Trigger PostgreSQL |
| 2 | Bloqueio de envio sem fotos obrigatórias | Validação frontend |
| 3 | Notificação ao gestor quando checklist é enviado | Trigger PostgreSQL + Realtime |
| 4 | Notificação ao gestor quando checklist é reprovado | Trigger PostgreSQL + Realtime |
| 5 | Alteração automática de status + auditoria (reviewed_by, reviewed_at) | Lógica de negócio |
| 6 | Alerta diário para veículos sem checklist nas últimas 24h | pg_cron (job agendado às 08h) |

---

## 🗂️ Estrutura do projeto

```
checklist-frota/
├── src/
│   ├── components/
│   │   └── Header.jsx
│   ├── contexts/
│   │   └── AuthContext.jsx
│   ├── hooks/
│   │   └── useAuth.js
│   ├── lib/
│   │   └── supabase.js
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── colaborador/
│   │   │   └── NovoChecklist.jsx
│   │   └── gestor/
│   │       ├── Dashboard.jsx
│   │       └── DetalhesChecklist.jsx
│   ├── App.jsx
│   └── main.jsx
├── supabase/
│   ├── schema.sql
│   ├── seed_vehicles.sql
│   ├── notifications.sql
│   ├── rls_policies.sql
│   └── trigger_profiles.sql
├── .env.example
└── README.md
```

---

## 🔧 Como rodar o projeto

### Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)

### 1. Clone o repositório

```bash
git clone https://github.com/Mateusrlohnn/checklist-frota.git
cd checklist-frota
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo de exemplo e preencha com suas credenciais:

```bash
cp .env.example .env
```

Edite o `.env`:

```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

### 4. Configure o banco de dados

Execute os arquivos SQL na seguinte ordem no **SQL Editor do Supabase**:

```
1. supabase/schema.sql           → cria todas as tabelas
2. supabase/seed_vehicles.sql    → insere os 50 veículos da base
3. supabase/notifications.sql    → cria tabela de notificações e triggers
4. supabase/rls_policies.sql     → ativa Row Level Security
5. supabase/trigger_profiles.sql → trigger de criação automática de perfil
```

### 5. Configure o Storage

No painel do Supabase, crie um bucket chamado `checklist-photos` em **Storage → New bucket**.

### 6. Desative confirmação de email (desenvolvimento)

Em **Authentication → Providers → Email**, desmarque **Confirm email**.

### 7. Rode o projeto

```bash
npm run dev
```

Acesse: [http://localhost:5174](http://localhost:5174)

---

## 👤 Criando usuários de teste

No painel do Supabase, acesse **Authentication → Users → Add user → Create new user** e marque **Auto Confirm User**.

Após criar, execute no SQL Editor para definir o perfil:

```sql
INSERT INTO public.profiles (id, nome, email, role)
SELECT id, 'Nome do Usuário', email, 'colaborador'
FROM auth.users
WHERE email = 'email@teste.com'
ON CONFLICT (id) DO UPDATE SET role = 'colaborador', nome = 'Nome do Usuário';
```

Substitua `'colaborador'` por `'gestor'` para criar um gestor.

---

## 🔐 Segurança

- Autenticação via Supabase Auth (JWT)
- Row Level Security (RLS) ativo em todas as tabelas
- Colaboradores só acessam seus próprios dados
- Gestores têm acesso total aos checklists
- Credenciais nunca commitadas no repositório

---

## 📦 Base de veículos

O sistema já vem com 50 veículos pré-cadastrados cobrindo:

- **Tipos:** Carro, Utilitário, Caminhão
- **Modelos:** Scania R450, Gol, Onix, Volvo FH, HB20, Hilux, Strada
- **Seguradoras:** Bradesco, Porto Seguro, Allianz, SulAmérica
- **Cidades:** Florianópolis, São José, Palhoça, Biguaçu — SC
