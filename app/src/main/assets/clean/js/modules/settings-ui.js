window.SettingsUI=(function(){
  function render(data){
    Dom.setHeader('Ajustes','Diagnóstico, migração, testes e manutenção da Clean Core.');
    const legacy=MigrationService.oldKeyExists();
    const size=JSON.stringify(data).length;
    Dom.render(`${Components.card('Estado da base limpa',`Versão dos dados: <b>${data.version||1}</b><br>Migrado do legado: <b>${data.migratedFromLegacy?'Sim':'Não'}</b><br>Dados legados detectados: <b>${legacy?'Sim':'Não'}</b><br>Tamanho aproximado: <b>${size} caracteres</b>`)}${Components.card('Testes dos engines','Abra o arquivo de testes para validar regras centrais de finanças, dívidas e tarefas.<br><br><code>assets/clean/tests/engine-tests.html</code>')}${Components.button('Rodar migração novamente','runMigration','secondary')}${Components.button('Resetar dados da Clean Core','resetClean','danger')}${Components.button('Criar massa de demonstração','seedDemo','secondary')}`);
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
    App.render();Dom.toast('Massa de demonstração criada.');
  }
  return {render,runMigration,resetClean,seedDemo};
})();
