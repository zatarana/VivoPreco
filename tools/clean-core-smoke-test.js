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
  'app/src/main/assets/clean/js/core/task-engine.js',
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

function assert(name, condition) {
  if (!condition) throw new Error(`FAIL: ${name}`);
  console.log(`PASS: ${name}`);
}

const data = {
  version: 1,
  wallets: [context.Models.wallet()],
  transactions: [],
  bills: [],
  debts: [],
  projects: [{ id: 'project_inbox', name: 'Inbox', sections: ['Entrada'], view: 'list' }],
  tasks: []
};

context.FinanceEngine.addTransaction(data, { type: 'receita', value: 1000, description: 'Salário' });
context.FinanceEngine.addTransaction(data, { type: 'despesa', value: 250, description: 'Mercado' });
assert('saldo da carteira', context.FinanceEngine.totalWalletBalance(data) === 750);

const bill = context.FinanceEngine.addBill(data, { name: 'Energia', flow: 'A_PAGAR', expected: 200 });
assert('conta pendente', context.FinanceEngine.payable(data) === 200);
context.FinanceEngine.settleBill(data, bill.id, 200);
assert('conta paga zera pendente', context.FinanceEngine.payable(data) === 0);
assert('conta paga gera despesa', context.FinanceEngine.expense(data) === 450);

const debt = context.DebtEngine.addDebt(data, { name: 'Cartão', original: 1000, balance: 1000, minPayment: 100 });
assert('cadastrar dívida não cria despesa', context.FinanceEngine.expense(data) === 450);
context.DebtEngine.pay(data, debt.id, 300, 300);
assert('pagar dívida cria despesa', context.FinanceEngine.expense(data) === 750);
assert('pagar dívida reduz saldo vivo', context.DebtEngine.total(data) === 700);

const task = context.TaskEngine.addTask(data, { title: 'Teste', projectId: 'project_inbox' });
context.TaskEngine.complete(data, task.id);
assert('tarefa concluída', context.TaskEngine.completedTasks(data).length === 1);

const audit = context.AuditService.run(data);
assert('auditoria sem erros críticos', audit.ok === true);
console.log('Clean Core smoke tests OK');
