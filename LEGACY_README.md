# VivoPreco — Legado e Clean Core

O projeto foi reorganizado em uma nova base chamada Clean Core.

A versão principal do APK agora carrega a base limpa em:

- app/src/main/assets/loader-clean.html
- app/src/main/assets/clean/index.html

## Situação dos arquivos antigos

Os arquivos criados antes da Clean Core permanecem no repositório apenas como referência temporária. Eles representam a fase de prototipagem rápida e não devem receber novas funcionalidades.

A nova implementação deve acontecer dentro da pasta:

- app/src/main/assets/clean

## Nova estrutura oficial

A Clean Core separa responsabilidades em camadas:

- modelos de dados;
- validações;
- armazenamento local;
- engines de regra de negócio;
- componentes de interface;
- telas por módulo.

## Regra para novas funcionalidades

Novas funcionalidades devem seguir esta ordem:

1. Criar ou ajustar modelo de dados.
2. Validar entradas.
3. Implementar regra no engine correto.
4. Adicionar teste ou auditoria interna.
5. Criar ou ajustar a interface.

A interface não deve concentrar regra de negócio.

## Critérios antes de apagar arquivos antigos

Os arquivos legados só devem ser removidos depois que:

- o APK debug da Clean Core compilar;
- o smoke test passar no GitHub Actions;
- transações, contas, dívidas e tarefas forem testadas no celular;
- nenhuma função essencial depender da versão antiga.

## Observação

A auditoria de dados existe apenas como ferramenta interna e de qualidade. Ela não deve aparecer como botão principal para o usuário final.
