window.SettingsUI=(function(){
  function render(data){
    Dom.setHeader('Ajustes','Preferências, backup e manutenção.');
    const legacy=MigrationService.oldKeyExists();
    const size=JSON.stringify(data).length;
    const s=BackupService.summary(data);
    const nativeStatus=StorageService.hasNative&&StorageService.hasNative()?'Ativo':'Indisponível nesta execução';
    Dom.render(`${Components.card('Resumo dos dados',`Carteiras: <b>${s.wallets}</b><br>Transações: <b>${s.transactions}</b><br>Contas: <b>${s.bills}</b><br>Dívidas: <b>${s.debts}</b><br>Tarefas: <b>${s.tasks}</b><br>Projetos: <b>${s.projects}</b><br>Sessões de tempo: <b>${s.timeLogs}</b><br>Categorias: <b>${s.categories}</b><br>Orçamentos: <b>${s.budgets}</b><br>Metas: <b>${s.goals}</b><br>Cartões: <b>${s.cards}</b><br>Compras no cartão: <b>${s.cardPurchases}</b>`)}${Components.card('Dados locais',`Versão dos dados: <b>${data.version||1}</b><br>Armazenamento nativo: <b>${nativeStatus}</b><br>Migração realizada: <b>${data.migratedFromLegacy?'Sim':'Não'}</b><br>Dados antigos detectados: <b>${legacy?'Sim':'Não'}</b><br>Uso local aproximado: <b>${size} caracteres</b>`)}<div class="row">${Components.button('Exportar backup','exportBackup')}${Components.button('Importar backup','importBackup','secondary')}</div><div class="row">${Components.button('Carteiras','showWallets','secondary')}${Components.button('Planejamento','showPlanning','secondary')}</div><div class="row">${Components.button('Criar demonstração','seedDemo','secondary')}</div>${Components.card('Sobre','DiasOrganize usa armazenamento local no aparelho. Exporte backup antes de limpar dados, trocar de celular ou reinstalar o app.')} ${Components.button('Rodar migração novamente','runMigration','secondary')}${Components.button('Resetar dados','resetClean','danger')}<input id="backupFileInput" type="file" accept="application/json,.json" hidden>`);
  }
  function runMigration(){MigrationService.migrateIfNeeded();App.render();Dom.toast('Migração verificada.');}
  function resetClean(){if(!confirm('Resetar os dados locais?'))return;StorageService.reset();App.render();Dom.toast('Dados resetados.');}
  function exportBackup(){BackupService.download();Dom.toast('Backup exportado.');}
  function importBackup(){const input=Dom.$('#backupFileInput');if(!input)return;input.onchange=function(){const file=input.files&&input.files[0];if(!file)return;const reader=new FileReader();reader.onload=function(){try{BackupService.importJson(reader.result);App.render();Dom.toast('Backup importado.');}catch(err){Dom.toast(err.message||'Backup inválido.');}};reader.readAsText(file);};input.click();}
  function seedDemo(){
    StorageService.update(d=>{
      PlanningEngine.ensure(d);TimeEngine.ensure(d);
      FinanceEngine.addBill(d,{name:'Aluguel',flow:'A_PAGAR',expected:750,dueDate:Models.today(),category:'Moradia'});
      FinanceEngine.addBill(d,{name:'Reembolso',flow:'A_RECEBER',expected:120,dueDate:Models.today(),category:'Receita extra'});
      DebtEngine.addDebt(d,{name:'Acordo antigo',creditor:'Credor exemplo',kind:'Acordo parcelado',original:900,balance:900,minPayment:150});
      TaskEngine.addTask(d,{title:'Conferir contas do mês',projectId:'project_finance',dueDate:Models.today(),priority:'P1',labels:['finanças']});
      const study=TaskEngine.addTask(d,{title:'Estudar Português',projectId:'project_study',dueDate:Models.today(),priority:'P1',labels:['estudos'],recurrence:'diaria',seriesId:'series_estudar_portugues',estimatedMinutes:45});
      TimeEngine.addManualLog(d,study.id,45,'Sessão de demonstração',Models.today());
      PlanningEngine.addBudget(d,{category:'Moradia',month:new Date().toISOString().slice(0,7),limit:1200});
      PlanningEngine.addGoal(d,{name:'Reserva de emergência',target:3000,saved:450});
      const card=PlanningEngine.addCard(d,{name:'Cartão principal',limit:1500,closingDay:5,dueDay:12,walletId:FinanceEngine.defaultWalletId(d)});
      PlanningEngine.addCardPurchase(d,{cardId:card.id,description:'Compra exemplo',value:89.9,category:'Alimentação',date:Models.today(),invoiceMonth:new Date().toISOString().slice(0,7)});
    });
    App.render();Dom.toast('Dados de demonstração criados.');
  }
  return {render,runMigration,resetClean,seedDemo,exportBackup,importBackup};
})();
