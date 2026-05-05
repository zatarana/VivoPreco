window.App=(function(){
  let route='dashboard';
  const routes={dashboard:{label:'Início',render:DashboardUI.render},finance:{label:'Finanças',render:FinanceUI.render},debts:{label:'Dívidas',render:DebtUI.render},tasks:{label:'Tarefas',render:TasksUI.render},settings:{label:'Ajustes',render:SettingsUI.render}};
  function data(){return StorageService.read();}
  function renderNav(){const nav=Dom.$('#bottom-nav');nav.innerHTML=Object.keys(routes).map(key=>`<button class="${route===key?'active':''}" data-route="${key}">${routes[key].label}</button>`).join('');}
  function go(key){route=routes[key]?key:'dashboard';render();}
  function render(){try{renderNav();routes[route].render(data());}catch(err){console.error(err);Dom.render(`<div class="card danger-accent"><h3>Erro na tela</h3><p>${Dom.esc(err.message||err)}</p></div>`);}}
  function fab(){try{if(route==='finance')FinanceUI.newTransactionForm();else if(route==='debts')DebtUI.newDebtForm();else if(route==='tasks')TasksUI.newTaskForm();else if(route==='settings')SettingsUI.seedDemo();else FinanceUI.newTransactionForm();}catch(err){Dom.toast(err.message||'Erro ao abrir ação.');}}
  function handleAction(action,id){
    try{
      let handled=true;
      if(routes[action])go(action);
      else if(action==='newTransaction')FinanceUI.newTransactionForm();
      else if(action==='saveTransaction')FinanceUI.saveTransaction(data());
      else if(action==='newTransfer')FinanceUI.newTransferForm();
      else if(action==='saveTransfer')FinanceUI.saveTransfer();
      else if(action==='newBill')FinanceUI.newBillForm();
      else if(action==='saveBill')FinanceUI.saveBill(data());
      else if(action==='settleBill')FinanceUI.settleBill(data(),id);
      else if(action==='settleBillForm')FinanceUI.settleBillForm(id);
      else if(action&&action.startsWith('saveSettleBill:'))FinanceUI.saveSettleBill(action.split(':')[1]);
      else if(action==='showWallets')FinanceUI.showWallets(data());
      else if(action==='newWallet')FinanceUI.newWalletForm();
      else if(action==='saveWallet')FinanceUI.saveWallet();
      else if(action==='setDefaultWallet')FinanceUI.setDefaultWallet(id);
      else if(action==='showBills')FinanceUI.showBills(data());
      else if(action==='editBill')FinanceUI.editBillForm(id);
      else if(action&&action.startsWith('saveEditBill:'))FinanceUI.saveEditBill(action.split(':')[1]);
      else if(action==='deleteBill')FinanceUI.deleteBill(id);
      else if(action==='showFinanceReport')FinanceUI.showFinanceReport(data());
      else if(action==='newDebt')DebtUI.newDebtForm();
      else if(action==='saveDebt')DebtUI.saveDebt();
      else if(action==='payDebt')DebtUI.payDebtForm(id);
      else if(action&&action.startsWith('saveDebtPay:'))DebtUI.saveDebtPay(action.split(':')[1]);
      else if(action==='renegotiateDebt')DebtUI.renegotiateForm(id);
      else if(action&&action.startsWith('saveRenegotiate:'))DebtUI.saveRenegotiate(action.split(':')[1]);
      else if(action==='discountDebt')DebtUI.adjust(id,'Desconto');
      else if(action==='chargeDebt')DebtUI.adjust(id,'Acréscimo');
      else if(action==='newTask')TasksUI.newTaskForm();
      else if(action==='saveTask')TasksUI.saveTask();
      else if(action==='newProjectTask')TasksUI.newTaskForm(id);
      else if(action==='newProject')TasksUI.newProjectForm();
      else if(action==='saveProject')TasksUI.saveProject();
      else if(action==='completeTask')TasksUI.completeTask(id);
      else if(action==='reopenTask')TasksUI.reopenTask(id);
      else if(action==='editTask')TasksUI.editTaskForm(id);
      else if(action&&action.startsWith('saveEditTask:'))TasksUI.saveEditTask(action.split(':')[1]);
      else if(action==='deleteTask')TasksUI.deleteTask(id);
      else if(action==='newSubtask')TasksUI.newSubtaskForm(id);
      else if(action&&action.startsWith('saveSubtask:'))TasksUI.saveSubtask(action.split(':')[1]);
      else if(action==='newComment')TasksUI.newCommentForm(id);
      else if(action&&action.startsWith('saveComment:'))TasksUI.saveComment(action.split(':')[1]);
      else if(action==='showUpcoming')TasksUI.showUpcoming(data());
      else if(action==='showTaskFilters')TasksUI.showTaskFilters(data());
      else if(action==='showLabels')TasksUI.showLabels(data());
      else if(action==='openLabel')TasksUI.openLabel(id);
      else if(action==='openProject')TasksUI.openProject(id);
      else if(action==='showTaskBoard')TasksUI.showTaskBoard(data());
      else if(action==='runMigration')SettingsUI.runMigration();
      else if(action==='resetClean')SettingsUI.resetClean();
      else if(action==='seedDemo')SettingsUI.seedDemo();
      else handled=false;
      if(!handled&&window.AppExtensions&&AppExtensions.run(action,id))handled=true;
      if(!handled)Dom.toast('Ação não encontrada: '+action);
    }catch(err){console.error(err);Dom.toast(err.message||'Não foi possível concluir a ação.');}
  }
  document.addEventListener('click',e=>{const r=e.target.closest('[data-route]');if(r)return go(r.dataset.route);const close=e.target.closest('[data-close-sheet]');if(close)return Dom.closeSheet();const a=e.target.closest('[data-action]');if(a){e.preventDefault();return handleAction(a.dataset.action,a.dataset.id);}});
  Dom.$('#fab').addEventListener('click',fab);
  try{MigrationService.migrateIfNeeded();}catch(err){console.warn('Migração ignorada:',err);}
  render();
  return {go,render,data,handleAction};
})();
