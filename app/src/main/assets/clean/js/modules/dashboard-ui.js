window.DashboardUI=(function(){
  function render(data){
    Dom.setHeader('Início','Seu resumo de hoje em um só lugar.');
    const balance=FinanceEngine.totalWalletBalance(data);
    const projected=FinanceEngine.projectedBalance(data,DebtEngine.minPayment(data));
    const todayTasks=TaskEngine.today(data);
    const overdueTasks=TaskEngine.overdue(data);
    const nextBills=(data.bills||[]).filter(b=>FinanceEngine.billRemaining(b)>0).sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate))).slice(0,4);
    const debts=DebtEngine.openDebts(data).slice(0,3);
    Dom.render(`<section class="finance-hero"><small>Saldo atual</small><h2>${Dom.money(balance)}</h2><div class="grid">${Components.metric('Projetado',Dom.money(projected),projected>=0?'success':'danger')}${Components.metric('Hoje',`${todayTasks.length} tarefa(s)`,'primary')}${Components.metric('A pagar',Dom.money(FinanceEngine.payable(data)),'danger')}${Components.metric('Dívidas',Dom.money(DebtEngine.total(data)),'warning')}</div></section><div class="row">${Components.button('+ Transação','newTransaction')}${Components.button('+ Tarefa','newTask','secondary')}</div><h2 class="section">Próximos vencimentos</h2>${nextBills.length?nextBills.map(b=>`<div class="item"><h4>${Dom.esc(b.name)}</h4><div class="meta">${b.flow==='A_PAGAR'?'A pagar':'A receber'} • ${Dom.money(FinanceEngine.billRemaining(b))} • ${Dom.date(b.dueDate)}</div><div class="actions">${Components.mini('Liquidar','settleBillForm',b.id,'primary')}</div></div>`).join(''):Components.empty('Nenhuma conta pendente.')}<h2 class="section">Tarefas de hoje</h2>${todayTasks.length?todayTasks.slice(0,4).map(t=>`<div class="item task-accent"><h4>${Dom.esc(t.title)}</h4><div class="meta">${Dom.date(t.dueDate)} • ${Dom.esc(t.priority)}</div><div class="actions">${Components.mini('Concluir','completeTask',t.id,'primary')}</div></div>`).join(''):Components.empty('Nenhuma tarefa para hoje.')}<h2 class="section">Atenção</h2>${overdueTasks.length?Components.card('Tarefas atrasadas',`Você tem <b>${overdueTasks.length}</b> tarefa(s) atrasada(s). Abra Tarefas para revisar.`,'danger-accent'):Components.card('Tudo certo nas tarefas','Nenhuma tarefa atrasada no momento.','success-accent')}${debts.length?debts.map(d=>`<div class="item debt-accent"><h4>${Dom.esc(d.name)}</h4><div class="meta">Saldo ${Dom.money(d.balance)} • ${Dom.esc(d.status)}</div><div class="actions">${Components.mini('Detalhes','openDebt',d.id,'primary')}</div></div>`).join(''):Components.card('Dívidas','Nenhuma dívida aberta.','success-accent')}`);
  }
  return {render};
})();
