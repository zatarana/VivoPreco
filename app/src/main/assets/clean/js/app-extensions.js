window.AppExtensions=(function(){
  function data(){return StorageService.read();}
  function run(action,id){
    if(!action)return false;
    if(action==='newProjectTask'){TasksUI.newTaskForm(id);return true;}
    if(action==='reopenTask'){TasksUI.reopenTask(id);return true;}
    if(action==='editTask'){TasksUI.editTaskForm(id);return true;}
    if(action&&action.startsWith('saveEditTask:')){TasksUI.saveEditTask(action.split(':')[1]);return true;}
    if(action==='deleteTask'){TasksUI.deleteTask(id);return true;}
    if(action==='newSubtask'){TasksUI.newSubtaskForm(id);return true;}
    if(action&&action.startsWith('saveSubtask:')){TasksUI.saveSubtask(action.split(':')[1]);return true;}
    if(action==='newComment'){TasksUI.newCommentForm(id);return true;}
    if(action&&action.startsWith('saveComment:')){TasksUI.saveComment(action.split(':')[1]);return true;}
    if(action==='showUpcoming'){TasksUI.showUpcoming(data());return true;}
    if(action==='showTaskFilters'){TasksUI.showTaskFilters(data());return true;}
    if(action==='showLabels'){TasksUI.showLabels(data());return true;}
    if(action==='openLabel'){TasksUI.openLabel(id);return true;}
    if(action==='openProject'){TasksUI.openProject(id);return true;}
    if(action==='showTaskBoard'){TasksUI.showTaskBoard(data());return true;}

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

    if(action==='showPlanning'){PlanningUI.showHub(data());return true;}
    if(action==='showCategories'){PlanningUI.showCategories(data());return true;}
    if(action==='newCategory'){PlanningUI.newCategoryForm();return true;}
    if(action==='saveCategory'){PlanningUI.saveCategory();return true;}
    if(action==='deleteCategory'){PlanningUI.deleteCategory(id);return true;}
    if(action==='showBudgets'){PlanningUI.showBudgets(data());return true;}
    if(action==='newBudget'){PlanningUI.newBudgetForm();return true;}
    if(action==='saveBudget'){PlanningUI.saveBudget();return true;}
    if(action==='showGoals'){PlanningUI.showGoals(data());return true;}
    if(action==='newGoal'){PlanningUI.newGoalForm();return true;}
    if(action==='saveGoal'){PlanningUI.saveGoal();return true;}
    if(action==='contributeGoal'){PlanningUI.contributeGoalForm(id);return true;}
    if(action&&action.startsWith('saveGoalContribution:')){PlanningUI.saveGoalContribution(action.split(':')[1]);return true;}
    if(action==='deleteGoal'){PlanningUI.deleteGoal(id);return true;}
    if(action==='showCards'){PlanningUI.showCards(data());return true;}
    if(action==='newCard'){PlanningUI.newCardForm();return true;}
    if(action==='saveCard'){PlanningUI.saveCard();return true;}
    if(action==='deleteCard'){PlanningUI.deleteCard(id);return true;}
    return false;
  }
  function install(){
    if(window.IntegrationEngine)IntegrationEngine.install();
    document.addEventListener('click',function(e){
      const a=e.target.closest('[data-action]');
      if(!a)return;
      try{run(a.dataset.action,a.dataset.id);}catch(err){console.error(err);Dom.toast(err.message||'Não foi possível concluir a ação.');}
    });
  }
  setTimeout(install,0);
  return {run,install};
})();
