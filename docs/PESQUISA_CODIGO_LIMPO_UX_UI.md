# Pesquisa aplicada — Código Limpo, Design, UX e UI

Este documento registra a rodada de pesquisa e as mudanças aplicadas no VivoPreco.

## Fontes e princípios usados

### 1. Código limpo e arquitetura

- Separação de responsabilidades: a Activity Android deve hospedar a interface, não concentrar regra de negócio.
- Estado orientado por dados: a UI deve refletir modelos persistidos.
- Módulos com responsabilidade clara: app.js, finance-research.js, accounts-fab.js e ux-polish.js.
- Camadas incrementais: cada nova capacidade entra em arquivo isolado para reduzir risco de regressão.

Aplicação no projeto:

- Java ficou apenas como casca Android/WebView.
- HTML ficou como estrutura.
- CSS ficou como design system visual.
- JavaScript foi dividido por área funcional.
- A camada ux-polish.js aplica comportamento transversal sem reescrever todos os módulos.

### 2. Heurísticas de usabilidade

Foram aplicadas ideias de feedback visível, linguagem próxima ao usuário, consistência, prevenção de erro, recuperação de erro e ajuda contextual.

Aplicação no projeto:

- Toast de feedback após salvar/excluir.
- Desfazer exclusão.
- Dicas por tela.
- Botão + contextual.
- Menos abas na navegação inferior.
- Termos mais próximos da realidade financeira: A pagar, A receber, Vencimento, Valor previsto, Valor final.

### 3. UX/UI e acessibilidade

Foram aplicados princípios de alvos de toque, contraste, foco visível, redução de movimento, responsividade e suporte a modo escuro.

Aplicação no projeto:

- Alvos mínimos maiores para botões.
- Foco visível em campos e botões.
- Suporte a prefers-reduced-motion.
- Suporte a tema escuro do sistema.
- Cards com estados visuais mais claros.
- Animações curtas e discretas.

### 4. Padrões observados em apps financeiros

Foram incorporados padrões comuns de apps de finanças pessoais:

- contas a pagar e receber;
- recorrências e assinaturas;
- orçamento por categoria;
- alertas de limite;
- previsão de saldo;
- patrimônio líquido;
- metas;
- dívidas;
- exportação CSV;
- regras de categorização.

## Arquivos criados nesta rodada

```text
app/src/main/assets/ux-polish.css
app/src/main/assets/ux-polish.js
app/src/main/assets/loader-ux.html
```

## Comportamentos adicionados

- Feedback após ações importantes.
- Undo para exclusão comum.
- Foco automático no primeiro campo do formulário.
- Dicas contextuais por tela.
- Diagnóstico financeiro rápido na tela de Finanças.
- Atalho Ctrl/Cmd + K para busca global.
- Suporte visual a tema escuro.
- Suporte a redução de movimento.

## Próximas melhorias técnicas recomendadas

1. Refatorar app.js em módulos menores por domínio.
2. Criar testes automatizados para cálculo financeiro.
3. Criar camada de validação de formulários.
4. Adicionar gráficos Canvas/SVG para relatórios.
5. Substituir persistência localStorage por banco local nativo quando o MVP estabilizar.
6. Adicionar exportação real por arquivo via Android SAF.
