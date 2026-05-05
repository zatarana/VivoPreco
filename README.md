# VivoPreco - Android Debug no GitHub

Aplicativo Android local inspirado no documento **TickTick & Minhas Finanças** enviado como referência de produto.

A construção foi reorganizada em uma arquitetura híbrida local:

- **Java / Android nativo**: casco do APK, Activity principal, WebView e build debug.
- **HTML**: estrutura da interface.
- **CSS**: design responsivo, cards, bottom navigation, drawer e visual moderno.
- **JavaScript**: regras de negócio locais, persistência, formulários, navegação e módulos.
- **Gradle / GitHub Actions**: empacotamento e geração automática do APK debug.

## Por que usar WebView local?

O projeto pode usar quantas linguagens forem necessárias, desde que melhorem desempenho, funcionalidade ou design sem quebrar o build. Nesta etapa, a melhor solução foi usar Android nativo apenas como empacotador e deixar a interface em HTML/CSS/JS local. Isso permite avançar mais rápido em UI/UX, telas, formulários e regras sem depender de Compose, Hilt, Room ou bibliotecas pesadas.

## Módulos já concatenados do documento

### Produtividade / TickTick local

- Hoje / Today.
- Inbox.
- Listas.
- Calendário textual.
- Focus / sessões de foco.
- Hábitos.
- Countdown.
- Kanban.
- Timeline.
- Estatísticas.
- Notas.
- Busca global local.

### Minhas Finanças local

- Dashboard financeiro.
- Transações.
- Categorias.
- Carteiras.
- Planejamento / orçamento mensal.
- Metas financeiras.
- Dívidas.
- Relatórios.
- Importação CSV simples.
- Configurações e backup textual local.

## Estrutura principal

```text
.github/workflows/android.yml
settings.gradle.kts
build.gradle.kts
gradle.properties
app/build.gradle.kts
app/src/main/AndroidManifest.xml
app/src/main/java/com/zatarana/vivopreco/MainActivity.java
app/src/main/assets/index.html
app/src/main/assets/style.css
app/src/main/assets/app.js
docs/INSTRUCOES_BUILD_DEBUG.md
```

## Como gerar o APK debug pelo GitHub

1. Abra o repositório no GitHub.
2. Entre em **Actions**.
3. Abra o workflow **Android Debug APK**.
4. Clique em **Run workflow** ou envie um commit para a branch `main`.
5. Ao terminar, abra o run e baixe o artifact **vivopreco-debug-apk**.
6. Dentro do ZIP baixado estará o arquivo `app-debug.apk`.

## Como compilar localmente

Instale JDK 17, Android SDK e Gradle 8.7. Depois rode:

```bash
gradle :app:assembleDebug --stacktrace
```

O APK será gerado em:

```text
app/build/outputs/apk/debug/app-debug.apk
```

## Próximas etapas recomendadas

1. Notificações nativas para tarefas, hábitos, dívidas e contas recorrentes.
2. Exportação/importação real por arquivo usando Android SAF.
3. Gráficos em Canvas/SVG para relatórios.
4. Tema escuro e personalização visual.
5. Widgets Android nativos.
6. Migração opcional para banco local mais robusto quando o MVP estabilizar.
