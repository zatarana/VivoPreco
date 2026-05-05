# VivoPreco - Android Debug no GitHub

Aplicativo Android nativo e simples, criado para buildar APK debug automaticamente pelo GitHub Actions.

## O que o app já faz

- Dashboard inicial com saldo, tarefas e dívidas.
- Cadastro local de tarefas com prioridade e conclusão.
- Cadastro local de receitas e despesas com saldo automático.
- Cadastro local de dívidas, saldo devedor e pagamento.
- Cadastro local de metas financeiras e contribuições.
- Relatório rápido de produtividade e fluxo financeiro.
- Dados salvos no próprio aparelho usando SharedPreferences em JSON.
- Build debug automático no GitHub Actions.

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

## Observação

Este projeto não usa AndroidX, Compose, Hilt, Room nem dependências externas. Isso reduz a chance de erro no GitHub Actions e deixa o build mais leve.
