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
