# Auditoria técnica — VivoPreco

## Diagnóstico honesto

O estado atual do app é funcional em conceito, mas tecnicamente frágil. A evolução foi feita por camadas sucessivas de JavaScript e CSS, muitas vezes sobrescrevendo funções globais já existentes. Isso acelera prototipagem, mas cria riscos altos para manutenção, bugs silenciosos e inconsistência de comportamento.

A crítica de que o app está com aparência de remendos procede em parte, principalmente por estes motivos:

1. **Muitos loaders históricos**
   - Existem vários arquivos `loader-*.html` criados a cada etapa.
   - Apenas um é usado pela Activity, mas os antigos permanecem no projeto.
   - Isso confunde manutenção e revisão.

2. **Muitos scripts globais carregados em cascata**
   - `app.js`
   - `finance-research.js`
   - `accounts-fab.js`
   - `ux-polish.js`
   - `mf-finance.js`
   - `debt-lab.js`
   - `debt-model-v2.js`
   - `finance-integrity.js`
   - `todoist-tasks.js`
   - `date-time-pickers.js`

3. **Sobrescrita de funções globais**
   - Funções como `fin`, `debts`, `forecast`, `accounts`, `prod`, `saveTx` e `contextAdd` são redefinidas por arquivos diferentes.
   - Isso torna difícil prever qual regra está valendo no final.

4. **Redundância funcional**
   - Há mais de uma implementação para Dívidas.
   - Há mais de uma implementação para Finanças.
   - Há loaders intermediários que não deveriam mais existir.

5. **Ausência de uma fonte única de verdade desde o início**
   - A camada `finance-integrity.js` tenta corrigir isso no final, mas o ideal é que ela seja o núcleo do app, não um remendo posterior.

6. **Mistura de UI, estado e regra de negócio**
   - O mesmo arquivo muitas vezes renderiza HTML, calcula saldo, atualiza dados e trata clique.
   - Isso dificulta testes e aumenta risco de bug.

7. **Sem testes automatizados**
   - Não há testes para cálculos financeiros, dívidas, contas, transações ou tarefas.
   - Em app financeiro, isso é uma falha crítica.

## O que deve ser feito agora

A solução correta não é continuar adicionando camadas. A solução é reconstruir o núcleo em uma arquitetura limpa, preservando as melhores funcionalidades já definidas.

## Estratégia de reconstrução

### Fase 1 — Congelamento de remendos

- Parar de criar novos arquivos `loader-*` a cada pedido.
- Definir um único ponto de entrada: `index.html`.
- Definir um único CSS principal carregando tokens e módulos.
- Definir um único script principal que importa módulos internos ou, se ficar sem build step, organiza namespaces.

### Fase 2 — Modelo de domínio

Criar modelos claros:

```text
Task
Project
Transaction
Wallet
Bill
Debt
DebtEvent
Budget
Goal
Subscription
CreditCard
```

Cada modelo deve ter campos obrigatórios, campos opcionais e regras de validação.

### Fase 3 — Fonte única de verdade financeira

Criar um serviço central:

```text
FinanceEngine
```

Responsabilidades:

- calcular saldo de carteiras;
- calcular receitas/despesas reais;
- calcular contas pendentes;
- calcular previsão;
- aplicar pagamento de conta;
- aplicar pagamento de dívida;
- gerar transação quando houver dinheiro real;
- impedir duplicidade.

### Fase 4 — Serviços separados

Criar serviços por domínio:

```text
TaskService
ProjectService
FinanceService
DebtService
ReportService
StorageService
```

Nenhuma tela deve manipular localStorage diretamente.

### Fase 5 — UI componentizada

Criar componentes reutilizáveis:

```text
Card
MetricCard
BottomNav
SheetForm
DateField
TimeField
TransactionList
DebtCard
TaskItem
ProjectCard
```

### Fase 6 — Remoção de redundâncias

Remover ou arquivar:

- loaders antigos;
- scripts substituídos;
- funções duplicadas;
- estilos conflitantes.

### Fase 7 — Testes mínimos

Criar testes simples em JavaScript puro para:

- saldo de carteira;
- pagamento de conta;
- recebimento de conta;
- renegociação de dívida;
- pagamento de dívida;
- antecipação de parcela;
- conclusão de tarefa;
- criação de subtarefa.

### Fase 8 — UX final

Só depois da regra estar estável:

- melhorar animações;
- polir telas;
- ajustar cores;
- revisar microcopy;
- revisar responsividade;
- revisar acessibilidade.

## Decisão recomendada

O app deve entrar em modo de reconstrução técnica.

A partir daqui, novas funcionalidades devem ser adicionadas apenas se respeitarem:

1. modelo claro;
2. serviço central;
3. estado único;
4. tela sem regra duplicada;
5. teste simples do comportamento.

## Objetivo da versão limpa

Criar uma versão `Clean Core` com menos arquivos, menos mágica e menos sobrescrita global:

```text
assets/
  index.html
  styles/
    tokens.css
    layout.css
    components.css
    modules.css
  js/
    core/storage.js
    core/finance-engine.js
    core/task-engine.js
    modules/finance-ui.js
    modules/debt-ui.js
    modules/tasks-ui.js
    app.js
```

Sem build step inicialmente, para manter GitHub Actions simples. Depois, se o app amadurecer, migrar para Kotlin/Compose ou React/TypeScript com build controlado.
