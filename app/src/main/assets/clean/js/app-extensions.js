window.AppExtensions=(function(){
  function data(){return StorageService.read();}
  function run(action,id){
    if(!action)return false;

    if(action==='editProject'){TasksUI.editProjectForm(id);return true;}
    if(action&&action.startsWith('saveEditProject:')){TasksUI.saveEditProject(action.split(':')[1]);return true;}
    if(action==='deleteProject'){TasksUI.deleteProjectForm(id);return true;}
    if(action&&action.startsWith('confirmDeleteProject:')){TasksUI.confirmDeleteProject(action.split(':')[1]);return true;}
    if(action&&action.startsWith('completeTaskNoTime:')){TasksUI.completeTaskNoTime(action.split(':')[1]);return true;}
    if(action&&action.startsWith('completeTaskWithTime:')){TasksUI.completeTaskWithTime(action.split(':')[1]);return true;}
    if(action&&action.startsWith('completeTaskWithQuickTime:')){const parts=action.split(':');TasksUI.completeTaskWithQuickTime(parts[1],parts[2]);return true;}

    if(action==='addTime'){TimeUI.addTimeForm(id);return true;}
    if(action&&action.startsWith('saveManualTime:')){TimeUI.saveManualTime(action.split(':')[1]);return true;}
    if(action==='editTimeLog'){TimeUI.editLogForm(id);return true;}
    if(action&&action.startsWith('saveEditTimeLog:')){TimeUI.saveEditLog(action.split(':')[1]);return true;}
    if(action==='deleteTimeLog'){TimeUI.deleteLog(id);return true;}
    if(action==='timer'){TimeUI.timerPanel(id);return true;}
    if(action&&action.startsWith('startTimer:')){TimeUI.startTimer(action.split(':')[1]);return true;}
    if(action==='pauseTimer'){TimeUI.pauseTimer();return true;}
    if(action==='resumeTimer'){TimeUI.resumeTimer();return true;}
    if(action==='finishTimer'){TimeUI.finishTimer();return true;}
    if(action==='cancelTimer'){TimeUI.cancelTimer();return true;}
    if(action==='timeDetails'){TimeUI.taskTimeDetails(id);return true;}
    if(action==='projectTime'){TimeUI.projectTime(id);return true;}
    if(action&&action.startsWith('projectTimeRange:')){const parts=action.split(':');TimeUI.projectTime(parts[1],parts[2]);return true;}

    if(action==='editDebt'){DebtUI.editDebtForm(id);return true;}
    if(action&&action.startsWith('saveEditDebt:')){DebtUI.saveEditDebt(action.split(':')[1]);return true;}
    if(action==='deleteDebt'){DebtUI.deleteDebt(id);return true;}
    if(action==='archiveDebt'){DebtUI.archiveDebt(id);return true;}
    if(action==='showArchivedDebts'){DebtUI.showArchivedDebts();return true;}
    if(action==='correctDebt'){DebtUI.correctDebtForm(id);return true;}
    if(action&&action.startsWith('saveCorrectDebt:')){DebtUI.saveCorrectDebt(action.split(':')[1]);return true;}
    if(action==='contestDebt'){DebtUI.contestDebt(id);return true;}
    if(action==='advanceDebt'){DebtUI.advanceDebtForm(id);return true;}
    if(action&&action.startsWith('saveAdvanceDebt:')){DebtUI.saveAdvanceDebt(action.split(':')[1]);return true;}
    if(action==='openDebt'){DebtUI.openDebt(id);return true;}

    if(action==='exportBackup'){SettingsUI.exportBackup();return true;}
    if(action==='importBackup'){SettingsUI.importBackup();return true;}
    if(action==='editWallet'){FinanceUI.editWalletForm(id);return true;}
    if(action&&action.startsWith('saveEditWallet:')){FinanceUI.saveEditWallet(action.split(':')[1]);return true;}
    if(action==='deleteWallet'){FinanceUI.deleteWallet(id);return true;}
    if(action==='editTransaction'){FinanceUI.editTransactionForm(id);return true;}
    if(action&&action.startsWith('saveEditTransaction:')){FinanceUI.saveEditTransaction(action.split(':')[1]);return true;}
    if(action==='deleteTransaction'){FinanceUI.deleteTransaction(id);return true;}

    if(action==='showPlanning'){PlanningUI.showHub(data());return true;}
    if(action==='showCategories'){PlanningUI.showCategories(data());return true;}
    if(action==='newCategory'){PlanningUI.newCategoryForm();return true;}
    if(action==='saveCategory'){PlanningUI.saveCategory();return true;}
    if(action==='editCategory'){PlanningUI.editCategoryForm(id);return true;}
    if(action&&action.startsWith('saveEditCategory:')){PlanningUI.saveEditCategory(action.split(':')[1]);return true;}
    if(action==='deleteCategory'){PlanningUI.deleteCategory(id);return true;}
    if(action==='showBudgets'){PlanningUI.showBudgets(data());return true;}
    if(action==='newBudget'){PlanningUI.newBudgetForm();return true;}
    if(action==='saveBudget'){PlanningUI.saveBudget();return true;}
    if(action==='editBudget'){PlanningUI.editBudgetForm(id);return true;}
    if(action&&action.startsWith('saveEditBudget:')){PlanningUI.saveEditBudget(action.split(':')[1]);return true;}
    if(action==='deleteBudget'){PlanningUI.deleteBudget(id);return true;}
    if(action==='copyBudgets'){PlanningUI.copyBudgets();return true;}
    if(action==='showGoals'){PlanningUI.showGoals(data());return true;}
    if(action==='newGoal'){PlanningUI.newGoalForm();return true;}
    if(action==='saveGoal'){PlanningUI.saveGoal();return true;}
    if(action==='editGoal'){PlanningUI.editGoalForm(id);return true;}
    if(action&&action.startsWith('saveEditGoal:')){PlanningUI.saveEditGoal(action.split(':')[1]);return true;}
    if(action==='contributeGoal'){PlanningUI.contributeGoalForm(id);return true;}
    if(action&&action.startsWith('saveGoalContribution:')){PlanningUI.saveGoalContribution(action.split(':')[1]);return true;}
    if(action==='deleteGoal'){PlanningUI.deleteGoal(id);return true;}
    if(action==='showCards'){PlanningUI.showCards(data());return true;}
    if(action==='newCard'){PlanningUI.newCardForm();return true;}
    if(action==='saveCard'){PlanningUI.saveCard();return true;}
    if(action==='editCard'){PlanningUI.editCardForm(id);return true;}
    if(action&&action.startsWith('saveEditCard:')){PlanningUI.saveEditCard(action.split(':')[1]);return true;}
    if(action==='deleteCard'){PlanningUI.deleteCard(id);return true;}
    return false;
  }
  function install(){
    if(window.IntegrationEngine)IntegrationEngine.install();
    document.addEventListener('click',function(e){
      const a=e.target.closest('[data-action]');
      if(!a||a.dataset.handled==='1')return;
      try{if(run(a.dataset.action,a.dataset.id)){a.dataset.handled='1';}}catch(err){console.error(err);Dom.toast(err.message||'Não foi possível concluir a ação.');}
    });
  }
  setTimeout(install,0);
  return {run,install};
})();
