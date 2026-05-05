# Instruções - Build Debug do VivoPreco

## Objetivo

Este repositório foi preparado para gerar um APK debug automaticamente pelo GitHub Actions, sem depender de Android Studio no computador.

## Estrutura principal

- `settings.gradle.kts`: configura o projeto Gradle.
- `build.gradle.kts`: define o plugin Android.
- `app/build.gradle.kts`: configura o app Android.
- `app/src/main/AndroidManifest.xml`: registra a Activity principal.
- `app/src/main/java/com/zatarana/vivopreco/MainActivity.java`: código do aplicativo.
- `.github/workflows/android.yml`: workflow que gera o APK debug.

## Gerar APK pelo GitHub

1. Acesse o repositório `zatarana/VivoPreco`.
2. Clique na aba **Actions**.
3. Selecione **Android Debug APK**.
4. Clique em **Run workflow**.
5. Aguarde o run terminar com status verde.
6. Abra o run finalizado.
7. Baixe o artifact chamado **vivopreco-debug-apk**.
8. Extraia o ZIP baixado.
9. Instale `app-debug.apk` no Android.

## Instalação no celular

1. Envie o APK para o celular.
2. Toque no arquivo APK.
3. Permita instalação de apps desconhecidos para o app usado para abrir o APK.
4. Confirme a instalação.

## Debug

O APK gerado é debug porque o build type `debug` tem:

- `isDebuggable = true`;
- sufixo de pacote `.debug`;
- sufixo de versão `-debug`.

Isso permite instalar a versão debug separada de uma futura versão release.

## Em caso de erro no Actions

Abra o run com falha e veja a etapa vermelha. As mais comuns são:

- erro ao baixar Gradle ou plugin Android;
- erro de SDK Android;
- erro de sintaxe em Java;
- erro no Manifest.

O workflow já usa `--stacktrace` para mostrar o erro completo.
