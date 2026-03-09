O que foi preparado
Arquivos Kotlin (android-src/)
UberTextParser.kt — parseia o texto extraído da tela procurando por preço (R$), distância (km), duração (min/h) e nota do passageiro usando regex robustos
UberReaderService.kt — o AccessibilityService em si, que monitora o pacote com.ubercab.driver, extrai todo o texto visível na tela e debounce de 800ms para não spammar
UberReaderModule.kt — bridge React Native com os métodos: isAccessibilityEnabled, openAccessibilitySettings, startListening, stopListening e emissão de eventos para o JS
UberReaderPackage.kt — registra o módulo no React Native
uber_reader_config.xml — configuração XML do serviço, restrito aos pacotes do Uber Driver
Config Plugin (plugins/withUberAccessibility.js)
Executado automaticamente no expo prebuild. Faz 5 coisas:

Adiciona BIND_ACCESSIBILITY_SERVICE no AndroidManifest.xml
Declara o UberReaderService com intent-filter e meta-data corretos
Copia os arquivos Kotlin para o lugar certo no projeto Android gerado
Copia o XML de configuração para res/xml/
Injeta UberReaderPackage() no MainApplication.kt
API TypeScript (modules/UberReader.ts)
Interface limpa que o app usa — detecta automaticamente se está rodando em build nativo (retorna isAvailable() = true) ou no Expo Go (retorna false e usa clipboard como fallback).

UI atualizada (analisar.tsx)
O toggle "Analisar em tempo real" agora tem 3 estados:

Build nativo + serviço desativado → card explicando o serviço + botão "Abrir Configurações de Acessibilidade" + botão "Já ativei — verificar novamente"
Build nativo + serviço ativado → pílula verde "Conectado — monitorando o Uber Driver automaticamente"
Expo Go / clipboard → instruções de copiar o texto (comportamento atual)
Para compilar:
npx expo prebuild --platform android
npx expo run:android
# ou: eas build --platform android
