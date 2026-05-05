window.SettingsUI=(function(){
  function render(data){
    Dom.setHeader('Ajustes','Preferências e manutenção do aplicativo.');
    const legacy=MigrationService.oldKeyExists();
    const size=JSON.stringify(data).length;
    Dom.render(`${Components.card('Dados locais',`Versão dos dados: <b>${data.version||1}</b><br>Migração realizada: <b>${data.migratedFromLegacy?'Sim':'Não'}</b><br>Dados antigos detectados: <b>${legacy?'Sim':'Não'}</b><br>Uso local aproximado: <b>${size} caracteres</b>`)}${Components.card('Sobre esta versão','Você está usando a base limpa do VivoPreco, com regras financeiras, dívidas e tarefas centralizadas em núcleos separados.')} ${Components.button('Rodar migração novamente','runMigration','secondary')}${Components.button('Resetar dados da Clean Core','resetClean','danger')}${Components.button('Criar dados de demonstração','seedDemo','secondary')}`);
  }
  function runMigration(){MigrationService.migrateIfNeeded();App.render();Dom.toast('Migração verificada.');}
  function resetClean(){if(!confirm('Resetar somente os dados da Clean Core?'))return;StorageService.reset();App.render();Dom.toast('Clean Core resetada.');}
  function seedDemo(){
    StorageService.update(d=>{
      FinanceEngine.addBill(d,{name:'Aluguel',flow:'A_PAGAR',expected:750,dueDate:Models.today(),category:'Moradia'});
      FinanceEngine.addBill(d,{name:'Reembolso',flow:'A_RECEBER',expected:120,dueDate:Models.today(),category:'Receita extra'});
      DebtEngine.addDebt(d,{name:'Acordo antigo',creditor:'Credor exemplo',kind:'Acordo parcelado',original:900,balance:900,minPayment:150});
      TaskEngine.addTask(d,{title:'Conferir contas do mês',projectId:'project_finance',dueDate:Models.today(),priority:'P1',labels:['finanças']});
    });
    App.render();Dom.toast('Dados de demonstração criados.');
  }
  return {render,runMigration,resetClean,seedDemo};
})();
