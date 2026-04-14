# � Cofrinho Digital v2.0.0

Aplicativo multiplataforma (mobile + web) de controle de economias pessoais com metas, categorias, gráficos e autenticação.

Desenvolvido com **React Native + Expo SDK 55** e **Supabase** como backend.

---

## 📋 Índice

- [Funcionalidades](#-funcionalidades)
- [Arquitetura](#-arquitetura)
- [Tecnologias](#-tecnologias)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Instalação e Execução](#-instalação-e-execução)
- [Configuração do Supabase](#-configuração-do-supabase)
- [Banco de Dados](#-banco-de-dados)
- [Fluxo de Navegação](#-fluxo-de-navegação)
- [Segurança](#-segurança)
- [Categorias](#-categorias)
- [Tema e Aparência](#-tema-e-aparência)
- [Decisões Técnicas](#-decisões-técnicas)

---

## ✨ Funcionalidades

### v1.0 (Base)
- Onboarding com criação de meta de economia
- Registro de economias com valor, descrição e data
- Histórico com filtros (tudo, semana, mês)
- Gráficos de progresso (barra de progresso, pizza, linha)
- Modalidades de economia (diária, semanal, mensal)
- Tema claro/escuro/sistema
- Persistência local com AsyncStorage

### v2.0 (Atual)
- **Autenticação** — Login, cadastro e recuperação de senha via Supabase Auth
- **Banco de dados na nuvem** — Sincronização com Supabase (PostgreSQL + RLS)
- **Categorias** — 8 categorias padrão para classificar economias (Alimentação, Transporte, Lazer, Compras, Saúde, Educação, Moradia, Outro)
- **Estatísticas por categoria** — Dashboard com breakdown de economias por categoria com barras coloridas
- **Conquistas / Badges** — Sistema de 9 conquistas (primeiro registro, sequências, % do objetivo, diversificação)
- **Exportar dados (CSV)** — Exportar todas as economias em formato CSV via compartilhamento nativo
- **Perfil do usuário** — Seção de perfil nos ajustes com e-mail e logout
- **Suporte web** — Roda no navegador via `expo start --web` (build verificado)
- **Modo offline** — Funciona sem Supabase usando AsyncStorage como fallback
- **Row Level Security (RLS)** — Cada usuário vê apenas seus próprios dados

---

## 🏗 Arquitetura

```
┌─────────────────────────────────────────┐
│              Telas (app/)               │
│   login │ register │ onboarding │ tabs  │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│           Contexts (providers)          │
│   AuthContext │ DataContext │ ThemeCtx   │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│           Camada de Dados               │
│  AsyncStorage (local) │ Supabase (cloud)│
└─────────────────────────────────────────┘
```

### Fluxo de dados:
1. **AuthContext** gerencia sessão do usuário (Supabase Auth)
2. **DataContext** carrega/salva dados (Supabase se configurado, senão AsyncStorage)
3. **Hooks** (`useGoal`, `useSavings`, `useTheme`) consomem os contexts
4. **Telas** consomem os hooks e contexts

---

## 🛠 Tecnologias

| Tecnologia | Versão | Uso |
|---|---|---|
| Expo SDK | 55 | Framework de desenvolvimento |
| React Native | 0.83.4 | UI nativa multiplataforma |
| React | 19.2.5 | Biblioteca de componentes |
| TypeScript | 5.3.3 | Tipagem estática |
| Expo Router | 55 | Navegação baseada em arquivos |
| Supabase JS | 2.x | Backend (auth + database) |
| AsyncStorage | 2.2.0 | Persistência local offline |
| react-native-chart-kit | 6.12.0 | Gráficos |
| react-native-reanimated | 4.2.1 | Animações |
| react-native-web | 0.21.0 | Suporte web |

---

## 📁 Estrutura do Projeto

```
cofrinho-digital/
├── app/                        # Telas (file-based routing)
│   ├── _layout.tsx             # Layout raiz (providers + auth guard)
│   ├── login.tsx               # Tela de login
│   ├── register-account.tsx    # Tela de cadastro
│   ├── forgot-password.tsx     # Recuperação de senha
│   ├── onboarding.tsx          # Configuração inicial da meta
│   ├── modalities.tsx          # Seleção de modalidade
│   └── (tabs)/                 # Navegação por abas
│       ├── _layout.tsx         # Layout das abas
│       ├── index.tsx           # Início (dashboard)
│       ├── register.tsx        # Registrar economia
│       ├── history.tsx         # Histórico
│       └── settings.tsx        # Ajustes
├── components/                 # Componentes reutilizáveis
│   ├── Achievements.tsx        # Sistema de conquistas/badges
│   ├── ModalityCard.tsx        # Card de modalidade
│   ├── ProgressBar.tsx         # Barra de progresso
│   └── SavingsCard.tsx         # Card de economia (com categoria)
├── constants/                  # Constantes
│   ├── colors.ts               # Paleta de cores
│   └── theme.ts                # Definições de tema claro/escuro
├── contexts/                   # React Contexts (state management)
│   ├── AuthContext.tsx          # Autenticação (Supabase Auth)
│   ├── DataContext.tsx          # Dados (metas, economias, categorias)
│   └── ThemeContext.tsx         # Tema (claro/escuro/sistema)
├── hooks/                      # Custom hooks
│   ├── useGoal.ts              # Hook de meta
│   ├── useSavings.ts           # Hook de economias com filtros
│   └── useTheme.ts             # Hook de tema
├── lib/                        # Bibliotecas/configurações
│   └── supabase.ts             # Cliente Supabase
├── types/                      # Tipos TypeScript
│   └── index.ts                # Goal, SavingEntry, Category, etc.
├── utils/                      # Utilitários
│   ├── calculations.ts         # Cálculos de progresso
│   ├── currency.ts             # Formatação BRL
│   ├── notifications.ts        # Stubs de notificação
│   └── storage.ts              # Wrapper AsyncStorage
├── supabase/                   # Configuração do banco
│   └── schema.sql              # Schema completo (DDL + RLS + seeds)
├── app.json                    # Configuração Expo
├── package.json                # Dependências
├── tsconfig.json               # Configuração TypeScript
└── babel.config.js             # Configuração Babel
```

---

## 🚀 Instalação e Execução

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Expo Go no celular (para teste mobile)

### Instalação

```bash
cd cofrinho-digital
npm install --legacy-peer-deps
```

### Executar no celular (Expo Go)

```bash
npx expo start --clear
```

Escaneie o QR code com o app Expo Go.

### Executar no navegador (web)

```bash
npx expo start --web
```

---

## ☁️ Configuração do Supabase

O app funciona **sem Supabase** (modo offline com AsyncStorage). Para habilitar autenticação e banco na nuvem:

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Crie um novo projeto
3. Copie a **URL** e a **anon key** do projeto (Settings → API)

### 2. Configurar as chaves

Edite o arquivo `lib/supabase.ts`:

```typescript
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA-ANON-KEY-AQUI';
```

### 3. Executar o schema SQL

No painel do Supabase, vá em **SQL Editor** e execute o conteúdo de `supabase/schema.sql`.

Isso criará:
- Tabela `profiles` (perfis de usuário)
- Tabela `goals` (metas de economia)
- Tabela `categories` (categorias com 8 padrões)
- Tabela `savings` (registros de economia)
- Políticas RLS para cada tabela
- Trigger para criar perfil automaticamente no cadastro

### 4. Habilitar auth por email

No painel do Supabase: **Authentication → Providers → Email** (já habilitado por padrão).

---

## 🗄 Banco de Dados

### Diagrama ER (simplificado)

```
profiles (1) ──── (N) goals
    │
    └── (N) savings ──── (1) categories
```

### Tabelas

| Tabela | Descrição | Campos principais |
|---|---|---|
| `profiles` | Perfil do usuário | id, full_name, onboarding_completed |
| `goals` | Metas de economia | name, target_amount, target_date, active_modality |
| `categories` | Categorias | name, icon, color, is_default |
| `savings` | Registros de economia | amount, description, date, category_id |

### Row Level Security (RLS)

Todas as tabelas têm RLS habilitado. Cada usuário só pode:
- **SELECT**: Ver seus próprios dados (+ categorias padrão)
- **INSERT**: Criar dados vinculados ao seu `user_id`
- **UPDATE/DELETE**: Modificar apenas seus próprios dados

---

## 🔀 Fluxo de Navegação

```
                    ┌─ Login ─────────┐
                    │                 │
Entrada ──→ Auth? ──┤                 ├──→ Onboarding ──→ Tabs
                    │                 │
                    └─ Cadastro ──────┘
                    └─ Esqueci senha ─┘

Tabs:
├── Início (dashboard + gráficos)
├── Registrar (valor + categoria + descrição + data)
├── Histórico (lista + filtros)
└── Ajustes (perfil + meta + modalidade + tema + reset)
```

### Lógica de roteamento (`_layout.tsx`):
1. Se Supabase configurado e sem sessão → Login
2. Se logado (ou sem Supabase) e sem onboarding → Onboarding
3. Se logado e onboarding feito → Tabs

---

## 🔒 Segurança

- **Autenticação**: Supabase Auth com email/senha
- **RLS**: Row Level Security no PostgreSQL — isolamento de dados por usuário
- **Senhas**: Nunca armazenadas localmente, gerenciadas pelo Supabase
- **Chaves**: A `anon key` é segura para uso no client (RLS protege os dados)
- **Modo offline**: Dados ficam apenas no dispositivo (AsyncStorage)
- **Validação**: Inputs validados antes de envio (valor, data, email)

---

## 🏷 Categorias

8 categorias padrão pré-configuradas:

| Ícone | Nome | Cor |
|---|---|---|
| 🍔 | Alimentação | #FF6B6B |
| 🚗 | Transporte | #4ECDC4 |
| 🎮 | Lazer | #45B7D1 |
| 🛍️ | Compras | #96CEB4 |
| 💊 | Saúde | #FFEAA7 |
| 📚 | Educação | #DDA0DD |
| 🏠 | Moradia | #98D8C8 |
| 📌 | Outro | #B0B0B0 |

As categorias aparecem como **chips selecionáveis** na tela de registro e como **badges coloridos** no histórico.

No **Dashboard**, há um card de "Economias por categoria" com barras de progresso coloridas mostrando o total por categoria.

---

## 🏆 Conquistas (Achievements)

O app possui um sistema de **9 conquistas** exibidas no dashboard como um carrossel horizontal:

| Ícone | Nome | Condição |
|---|---|---|
| 🌟 | Primeiro Passo | Registrou a 1ª economia |
| 🔥 | Constante | Registrou 10 economias |
| 📅 | Sequência de 3 | 3 dias seguidos economizando |
| 🏆 | Semana Perfeita | 7 dias seguidos economizando |
| 🎯 | 25% Alcançado | Atingiu 25% do objetivo |
| 💪 | Metade do Caminho | Atingiu 50% do objetivo |
| 🚀 | Quase Lá | Atingiu 75% do objetivo |
| 👑 | Meta Conquistada! | Atingiu 100% do objetivo |
| 🎨 | Diversificado | Usou 3 categorias diferentes |

Conquistas desbloqueadas aparecem com destaque; as pendentes ficam em opacidade reduzida.

---

## 📤 Exportação de Dados

Na tela de **Ajustes → Dados**, é possível exportar todas as economias em formato **CSV**:
- **Mobile**: Gera o arquivo e abre o compartilhamento nativo do sistema
- **Web**: Faz download direto do arquivo `.csv`

O CSV inclui: Data, Descrição, Valor, Categoria.

---

## 🎨 Tema e Aparência

O app suporta 3 modos:
- **Claro** — Fundo branco, textos escuros
- **Escuro** — Fundo escuro, textos claros
- **Sistema** — Segue a configuração do dispositivo

Cor primária: `#10B981` (verde esmeralda). Valores em Real Brasileiro (R$). Interface em Português do Brasil.

Configurável em **Ajustes → Aparência**.

---

## 📝 Decisões Técnicas

### Por que Supabase?
- Open source, grátis para projetos pequenos
- PostgreSQL com RLS embutido
- Auth pronto com email/senha
- SDK JavaScript de fácil integração
- Dashboard visual para gerenciamento

### Por que AsyncStorage como fallback?
- Permite uso offline sem necessidade de conta
- Backwards compatible com v1.0
- Dados sensíveis ficam no dispositivo quando sem internet

### Por que expo-router?
- Navegação baseada em arquivos (como Next.js)
- Suporte nativo a deep linking
- Integração nativa com Expo SDK

### Por que categorias locais (hardcoded)?
- Funciona offline sem Supabase
- Quando Supabase está configurado, as categorias vêm do banco
- As 8 categorias padrão são inseridas pelo schema SQL

### Remoção de expo-notifications
- A partir do SDK 53, `expo-notifications` não funciona no Expo Go
- Mantido como stubs (no-op) para não quebrar a interface
- Para reativar, é necessário build customizado (EAS Build)

---

## 📊 Scripts Disponíveis

```bash
npm start         # Inicia o Expo Dev Server
npm run web       # Abre no navegador
npm run android   # Abre no emulador Android
npm run ios       # Abre no simulador iOS
```

---

## 📄 Licença

Projeto acadêmico — Cofrinho Digital v2.0.0
