const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = [
  'app/src/main/assets/clean/js/core/models.js',
  'app/src/main/assets/clean/js/core/validators.js',
  'app/src/main/assets/clean/js/core/storage.js',
  'app/src/main/assets/clean/js/core/finance-engine.js',
  'app/src/main/assets/clean/js/core/debt-engine.js',
  'app/src/main/assets/clean/js/core/integration-engine.js',
  'app/src/main/assets/clean/js/core/task-engine.js',
  'app/src/main/assets/clean/js/core/time-engine.js',
  'app/src/main/assets/clean/js/core/planning-engine.js',
  'app/src/main/assets/clean/js/core/audit.js'
];

const store = {};
const context = {
  window: {},
  console,
  localStorage: {
    getItem: key => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: key => { delete store[key]; }
  }
};
context.window = context;
vm.createContext(context);

for (const f of files) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), context, { filename: f });
}
context.IntegrationEngine.install();

function assert(name, condition) {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.log(`PASS: ${name}`);
}

const data = {
  version: 1,
  preferences: { defaultWalletId: 'wallet_main' },
  wallets: [
    context.Models.wallet(),
    context.Models.wallet({ id: 'wallet_reserva', name: 'Reserva', initialBalance: -100 })
  ],
  transactions: [],
  bills: [],
  debts: [],
  projects: [
    { id: 'project_inbox', name: 'Inbox', sections: ['Entrada'], view: 'list', kind: 'comum', weeklyTargetMinutes: 0 },
    { id: 'project_study', name: 'Estudos', sections: ['Matérias'], view: 'list', kind: 'estudos', weeklyTargetMinutes: 600 }
  ],
  tasks: [],
  timeLogs: [],
  activeTimer: null,
  categories: [
    { id: 'cat_food', name: 'Alimentação', type: 'despesa' },
    { id: 'cat_card', name: 'Cartão', type: 'despesa' }
  ],
  budgets: [],
  goals: [],
  cards: [],
  cardPurchases: []
};

context.FinanceEngine.addTransaction(data, { type: 'receita', value: 1000, description: 'Salário', category: 'Receita' });
context.FinanceEngine.addTransaction(data, { type: 'despesa', value: 250, description: 'Mercado', category: 'Alimentação' });
assert('saldo da carteira principal', context.FinanceEngine.walletBalance(data, 'wallet_main') === 750);
assert('saldo total aceita carteira negativa', context.FinanceEngine.totalWalletBalance(data) === 650);

context.FinanceEngine.addTransfer(data, { value: 100, fromWalletId: 'wallet_main', toWalletId: 'wallet_reserva' });
assert('transferência reduz origem', context.FinanceEngine.walletBalance(data, 'wallet_main') === 650);
assert('transferência aumenta destino', context.FinanceEngine.walletBalance(data, 'wallet_reserva') === 0);
assert('transferência não altera receita/despesa', context.FinanceEngine.expense(data) === 250 && context.FinanceEngine.income(data) === 1000);

const bill = context.FinanceEngine.addBill(data, { name: 'Energia', flow: 'A_PAGAR', expected: 200 });
assert('conta pendente', context.FinanceEngine.payable(data) === 200);
context.FinanceEngine.settleBill(data, bill.id, 80);
assert('pagamento parcial reduz pendente', context.FinanceEngine.billRemaining(bill) === 120);
context.FinanceEngine.settleBill(data, bill.id, 120);
assert('conta paga zera pendente', context.FinanceEngine.payable(data) === 0);
assert('conta paga gera despesa', context.FinanceEngine.expense(data) === 450);

const debt = context.DebtEngine.addDebt(data, { name: 'Cartão', original: 1000, balance: 1000, minPayment: 100 });
assert('cadastrar dívida não cria despesa', context.FinanceEngine.expense(data) === 450);
context.DebtEngine.pay(data, debt.id, 300, 300);
assert('pagar dívida cria despesa', context.FinanceEngine.expense(data) === 750);
assert('pagar dívida reduz saldo vivo', context.DebtEngine.total(data) === 700);

const debt2 = context.DebtEngine.addDebt(data, { name: 'Acordo', original: 600, balance: 600 });
const renegotiation = context.DebtEngine.renegotiate(data, debt2.id, 500, 5, context.Models.today());
assert('renegociação cria parcelas', renegotiation.bills.length === 5);
const firstDebtBill = renegotiation.bills[0];
context.FinanceEngine.settleBill(data, firstDebtBill.id, 100);
assert('pagar parcela vinculada reduz dívida', debt2.balance === 400);

const task = context.TaskEngine.addTask(data, { title: 'Teste', projectId: 'project_inbox' });
context.TaskEngine.addSubtask(data, task.id, { title: 'Sub', projectId: 'project_inbox' });
context.TaskEngine.addComment(data, task.id, 'Comentário');
context.TaskEngine.complete(data, task.id);
assert('tarefa concluída', context.TaskEngine.completedTasks(data).length === 1);
assert('subtarefa criada', context.TaskEngine.subtasks(data, task.id).length === 1);

const recurring = context.TaskEngine.addTask(data, { title: 'Revisar matéria', projectId: 'project_study', dueDate: '2026-05-05', recurrence: 'diaria', seriesId: 'series_revisar_materia', estimatedMinutes: 30 });
const recurringResult = context.TaskEngine.complete(data, recurring.id);
assert('tarefa recorrente gera próxima ocorrência', recurringResult.next && recurringResult.next.dueDate === '2026-05-06');
assert('próxima ocorrência mantém série', recurringResult.next.seriesId === 'series_revisar_materia');
assert('não duplica próxima ocorrência se concluir de novo', data.tasks.filter(t => t.seriesId === 'series_revisar_materia' && t.dueDate === '2026-05-06' && !t.done).length === 1);

const studyTask = context.TaskEngine.addTask(data, { title: 'Estudar Português', projectId: 'project_study', recurrence: 'diaria', seriesId: 'series_estudar_portugues', estimatedMinutes: 45 });
context.TimeEngine.addManualLog(data, studyTask.id, 45, 'Sessão manual', context.Models.today());
assert('tempo manual soma na tarefa', context.TimeEngine.taskTotal(data, studyTask.id) === 45);
assert('tempo manual soma no projeto', context.TimeEngine.projectTotal(data, 'project_study') === 45);
assert('tempo manual soma na recorrência', context.TimeEngine.seriesTotal(data, 'series_estudar_portugues') === 45);
context.TimeEngine.startTimer(data, studyTask.id);
data.activeTimer.accumulatedSeconds = 120;
data.activeTimer.status = 'paused';
context.TimeEngine.finishTimer(data, 'Timer simulado');
assert('timer finalizado cria sessão mínima', context.TimeEngine.logsForTask(data, studyTask.id).length === 2);
assert('relatório de projeto computa total', context.TimeEngine.projectReport(data, 'project_study').total >= 46);

context.PlanningEngine.ensure(data);
const category = context.PlanningEngine.addCategory(data, { name: 'Estudos', type: 'despesa' });
assert('categoria criada', category.name === 'Estudos');
const budget = context.PlanningEngine.addBudget(data, { category: 'Alimentação', month: new Date().toISOString().slice(0, 7), limit: 500 });
assert('orçamento calcula gasto por categoria', context.PlanningEngine.budgetSpent(data, budget) === 250);
const goal = context.PlanningEngine.addGoal(data, { name: 'Reserva', target: 1000, saved: 200 });
context.PlanningEngine.contributeGoal(data, goal.id, 800);
assert('meta conclui ao atingir alvo', goal.status === 'Concluída');
const card = context.PlanningEngine.addCard(data, { name: 'Cartão Teste', limit: 1500, closingDay: 5, dueDay: 12, walletId: 'wallet_main' });
assert('cartão criado com limite', card.limit === 1500);
const purchase = context.PlanningEngine.addCardPurchase(data, { cardId: card.id, description: 'Compra mercado', value: 120, category: 'Alimentação', date: '2026-05-05', invoiceMonth: '2026-05' });
assert('compra no cartão registrada', purchase.value === 120 && data.cardPurchases.length === 1);
assert('limite usado do cartão calcula compras abertas', context.PlanningEngine.cardOpenTotal(data, card.id) === 120);
assert('limite disponível do cartão calcula corretamente', context.PlanningEngine.cardAvailableLimit(data, card.id) === 1380);
const invoice = context.PlanningEngine.closeCardInvoice(data, card.id, '2026-05', '2026-05-12');
assert('fechamento de fatura cria conta a pagar', invoice.bill && invoice.bill.flow === 'A_PAGAR' && invoice.bill.expected === 120);
assert('compra fechada fica vinculada à conta', data.cardPurchases[0].billId === invoice.bill.id);
assert('fatura fechada zera compras abertas do cartão', context.PlanningEngine.cardOpenTotal(data, card.id) === 0);
assert('conta da fatura entra no a pagar', context.FinanceEngine.payable(data) >= 120);

const audit = context.AuditService.run(data);
assert('auditoria sem erros críticos', audit.ok === true);
console.log('Clean Core smoke tests OK');
