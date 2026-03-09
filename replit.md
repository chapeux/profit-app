# Moto Ganhos

App mobile para motoristas de aplicativo (Uber) registrarem e analisarem seus ganhos.

## Stack

- **Frontend**: Expo (React Native) com Expo Router
- **Backend**: Express.js (apenas serve landing page e assets)
- **Armazenamento**: AsyncStorage (local, no dispositivo)
- **Estilo**: StyleSheet nativo com tema escuro
- **Linguagem**: TypeScript

## Arquitetura

```
app/
  _layout.tsx             Root layout + providers
  nova-corrida.tsx        Modal para registrar corrida
  (tabs)/
    _layout.tsx           Tab bar com NativeTabs (iOS 26) ou ClassicTabs
    index.tsx             Dashboard principal
    corridas.tsx          Lista de corridas + dashboard por período
    analisar.tsx          Analisador de corrida + semáforo em tempo real
    config.tsx            Configurações do veículo e thresholds

contexts/
  AppContext.tsx          Estado global + AsyncStorage + lógica de análise

components/
  TripCard.tsx            Card individual de corrida
  StatCard.tsx            Card de estatística
  Semaphore.tsx           Componente semáforo animado
```

## Funcionalidades

### Dashboard (index)
- Lucro líquido do dia em destaque
- Cards de totais: líquido, bruto, KM, média/corrida, combustível
- Lista das corridas do dia com ações de deletar
- Botão de adicionar corrida

### Corridas (corridas)
- Filtros: Todas, Hoje, Semana, Mês, **Intervalo personalizado** (modal com datas DD/MM/AAAA)
- Dashboard dinâmico por período: líquido, bruto, corridas, km, tempo, /km, /hora, média/corrida, custos
- Lista completa de corridas com TripCard

### Analisador (analisar)
- **Toggle "Analisar em tempo real"**: dois modos de operação:
  1. **Accessibility Service (build nativo Android)**: lê a tela do Uber Driver automaticamente sem
     copiar nada. UI mostra botão para ativar o serviço nas configurações do Android quando necessário.
  2. **Clipboard fallback (Expo Go / iOS / web)**: monitora clipboard a cada 2s via expo-clipboard —
     o usuário copia o texto da oferta e o app detecta automaticamente.
  - Popup animado com: sinal (verde/amarelo/vermelho), score, valor/km, /hora, /min, nota passageiro, lucro líquido
  - Badge indicando a fonte da leitura (acessibilidade ou clipboard)
- **Análise manual**: preencher campos e ver resultado instantâneo
- Thresholds configuráveis para cada métrica

### Configurações (config)
- KM por litro do carro
- Preço do litro de combustível
- Custo extra por KM (manutenção)
- Valor mínimo por KM (threshold verde)
- Valor mínimo por minuto (threshold verde)
- **Valor mínimo por hora (threshold verde)**
- Cálculo automático do custo total por KM

### Nova Corrida (modal)
- Valor bruto, distância, duração, nota do passageiro
- Preview em tempo real com semáforo e lucro líquido
- Validação de campos obrigatórios

## Cálculo de Lucro

```
fuelCost = (distanceKm / kmPerLiter) * fuelPricePerLiter
extraCost = distanceKm * costPerKmExtra
netValue = grossValue - fuelCost - extraCost
```

## Lógica do Semáforo

Score 0-100 baseado em 3 métricas (cada uma vale 33 pontos):
- Valor/km vs minGoodValuePerKm
- Valor/min vs minGoodValuePerMinute
- Valor/hora vs minGoodValuePerHour

Verde ≥ 70, Amarelo ≥ 40, Vermelho < 40

## Native Android Accessibility Service

Infraestrutura completa para build nativo com leitura automática do Uber Driver:

```
android-src/
  UberTextParser.kt         Parseia preço/km/tempo/nota do texto extraído
  UberReaderService.kt      AccessibilityService que monitora a tela do Uber
  UberReaderModule.kt       Bridge React Native (NativeModules)
  UberReaderPackage.kt      Registra o módulo no RN
  uber_reader_config.xml    Configuração XML do AccessibilityService

plugins/
  withUberAccessibility.js  Config plugin que injeta tudo no build (expo prebuild)

modules/
  UberReader.ts             API TypeScript para o módulo nativo
                            (isAvailable / isAccessibilityEnabled /
                             openAccessibilitySettings / startListening /
                             stopListening / addListener)
```

### Como compilar com Accessibility Service

```bash
# 1. Gerar projeto Android nativo
npx expo prebuild --platform android

# 2. Compilar APK de debug
npx expo run:android

# OU usar EAS Build
eas build --platform android --profile development
```

O config plugin (`./plugins/withUberAccessibility`) é declarado em `app.json`
e executado automaticamente pelo `expo prebuild`. Ele:
1. Adiciona `BIND_ACCESSIBILITY_SERVICE` permission ao AndroidManifest.xml
2. Declara `UberReaderService` no AndroidManifest.xml
3. Copia os arquivos Kotlin para `android/app/src/main/java/com/motoganhos/`
4. Copia `uber_reader_config.xml` para `android/app/src/main/res/xml/`
5. Registra `UberReaderPackage` no `MainApplication.kt`

## Workflows

- **Start Backend**: `npm run server:dev` (porta 5000)
- **Start Frontend**: `npm run expo:dev` (porta 8081)
