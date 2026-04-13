# 💰 Cofrinho Digital

Um aplicativo de poupança pessoal desenvolvido com React Native e Expo. Defina um objetivo financeiro, escolha uma modalidade de economia e acompanhe seu progresso dia a dia.

## 📱 Telas

- **Onboarding** – Configure seu objetivo: nome, valor e prazo
- **Modalidades** – Escolha entre economia diária fixa, desafio semanal progressivo ou corte de gastos mensal
- **Início (Dashboard)** – Veja seu progresso, quanto já economizou, dias restantes e um gráfico de evolução
- **Registrar** – Adicione novos registros de economia com valor, descrição e data
- **Histórico** – Filtre e visualize todos os registros; pressione e segure para excluir
- **Ajustes** – Edite o objetivo, troque a modalidade, configure notificações, altere o tema e redefina os dados

## 🚀 Como executar

```bash
# Instalar dependências
npm install

# Iniciar o projeto
npx expo start
```

Escaneie o QR code com o aplicativo Expo Go (Android/iOS) ou use um emulador.

## 🛠️ Stack

- **React Native** + **Expo SDK 52**
- **Expo Router** (roteamento baseado em arquivos)
- **AsyncStorage** para persistência local
- **react-native-chart-kit** para gráficos
- **expo-notifications** para lembretes locais
- **TypeScript**
- **Ionicons** (@expo/vector-icons)

## 📁 Estrutura de pastas

```
cofrinho-digital/
├── app/
│   ├── _layout.tsx          # Layout raiz com providers
│   ├── onboarding.tsx       # Tela de configuração inicial
│   ├── modalities.tsx       # Seleção de modalidade
│   └── (tabs)/
│       ├── _layout.tsx      # Navegação por abas
│       ├── index.tsx        # Dashboard
│       ├── register.tsx     # Registro de economia
│       ├── history.tsx      # Histórico
│       └── settings.tsx     # Ajustes
├── components/
│   ├── ProgressBar.tsx
│   ├── SavingsCard.tsx
│   └── ModalityCard.tsx
├── contexts/
│   ├── ThemeContext.tsx
│   └── DataContext.tsx
├── hooks/
│   ├── useGoal.ts
│   ├── useSavings.ts
│   └── useTheme.ts
├── utils/
│   ├── currency.ts
│   ├── calculations.ts
│   ├── storage.ts
│   └── notifications.ts
├── types/
│   └── index.ts
└── constants/
    ├── colors.ts
    └── theme.ts
```

## 🎨 Design

- Cor primária: `#10B981` (verde esmeralda)
- Suporte a tema claro/escuro/sistema
- Valores em Real Brasileiro (R$)
- Interface em Português do Brasil
