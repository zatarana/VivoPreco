window.App=(function(){
  let route='dashboard';
  const routes={dashboard:{label:'Início',render:DashboardUI.render},finance:{label:'Finanças',render:FinanceUI.render},debts:{label:'Dívidas',render:DebtUI.render},tasks:{label:'Tarefas',render:TasksUI.render}};
  function data(){return StorageService.read();}
  function renderNav(){const nav=Dom.$('#bottom-nav');nav.innerHTML=Object.keys(routes).map(key=>`<button class="${route===key?'active':''}" data-route="${key}">${routes[key].label}</button>`).join('');}
  function go(key){route=routes[key]?key:'dashboard';render();}
  function render(){try{renderNav();routes[route].render(data());}catch(err){console.error(err);Dom.render(`<div class="card danger-accent"><h3>Erro na tela</h3><p>${Dom.esc(err.message||err)}</p></div>`);}}
  function fab(){try{if(route==='finance')FinanceUI.newTransactionForm();else if(route==='debts')DebtUI.newDebtForm();else if(route==='tasks')TasksUI.newTaskForm();else FinanceUI.newTransactionForm();}catch(err){Dom.toast(err.message||'Erro ao abrir ação.');}}
  function handleAction(action,id){
    try{
      if(action==='newTransaction')return FinanceUI.newTransactionForm();
      if(action==='saveTransaction')return FinanceUI.saveTransaction(data());
      if(action==='newBill')return FinanceUI.newBillForm();
      if(action==='saveBill')return FinanceUI.saveBill(data());
      if(action==='settleBill')return FinanceUI.settleBill(data(),id);
      if(action==='newDebt')return DebtUI.newDebtForm();
      if(action==='saveDebt')return DebtUI.saveDebt();
      if(action==='payDebt')return DebtUI.payDebtForm(id);
      if(action&&action.startsWith('saveDebtPay:'))return DebtUI.saveDebtPay(action.split(':')[1]);
      if(action==='renegotiateDebt')return DebtUI.renegotiateForm(id);
      if(action&&action.startsWith('saveRenegotiate:'))return DebtUI.saveRenegotiate(action.split(':')[1]);
      if(action==='discountDebt')return DebtUI.adjust(id,'Desconto');
      if(action==='chargeDebt')return DebtUI.adjust(id,'Acréscimo');
      if(action==='newTask')return TasksUI.newTaskForm();
      if(action==='saveTask')return TasksUI.saveTask();
      if(action==='newProject')return TasksUI.newProjectForm();
      if(action==='saveProject')return TasksUI.saveProject();
      if(action==='completeTask')return TasksUI.completeTask(id);
    }catch(err){console.error(err);Dom.toast(err.message||'Não foi possível concluir a ação.');}
  }
  document.addEventListener('click',e=>{const r=e.target.closest('[data-route]');if(r)return go(r.dataset.route);const a=e.target.closest('[data-action]');if(a)return handleAction(a.dataset.action,a.dataset.id);});
  Dom.$('#fab').addEventListener('click',fab);
  try{MigrationService.migrateIfNeeded();}catch(err){console.warn('Migração ignorada:',err);}
  render();
  return {go,render,data};
})();
