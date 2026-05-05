window.MigrationService=(function(){
  function oldKeyExists(){
    return !!(localStorage.getItem('tasks')||localStorage.getItem('tx')||localStorage.getItem('debts')||localStorage.getItem('bills'));
  }
  function migrateIfNeeded(){
    const current=StorageService.read();
    if(current.migratedFromLegacy||!oldKeyExists())return current;
    const migrated=JSON.parse(JSON.stringify(current));
    try{migrateTransactions(migrated);migrateBills(migrated);migrateDebts(migrated);migrateTasks(migrated);}catch(e){console.warn('Migração parcial falhou:',e);}
    migrated.migratedFromLegacy=true;
    migrated.migratedAt=Models.today();
    StorageService.write(migrated);
    return migrated;
  }
  function parse(key){try{return JSON.parse(localStorage.getItem(key)||'[]');}catch(e){return [];}}
  function migrateTransactions(data){
    parse('tx').forEach(t=>{
      if(data.transactions.some(x=>x.description===t.desc&&Number(x.value)===Number(t.value)))return;
      data.transactions.push(Models.transaction({type:t.type==='receita'?'receita':'despesa',value:Number(t.value||0),description:t.desc||'Transação migrada',category:t.cat||'Geral',walletId:'wallet_main',date:normalizeDate(t.date)||Models.today()}));
    });
  }
  function migrateBills(data){
    parse('bills').forEach(b=>{
      data.bills.push(Models.bill({name:b.name||'Conta migrada',flow:b.flow==='A_RECEBER'?'A_RECEBER':'A_PAGAR',expected:Number(b.expected||0),settled:Number(b.settled||b.final||0),finalValue:Number(b.final||0),dueDate:normalizeDate(b.due)||Models.today(),category:b.cat||'Geral',walletId:'wallet_main',status:b.status||'PENDENTE',debtId:b.debtId||null}));
    });
  }
  function migrateDebts(data){
    parse('debts').forEach(d=>{
      data.debts.push(Models.debt({name:d.name||'Dívida migrada',creditor:d.creditor||'Não informado',kind:d.kind||'Outro',original:Number(d.original||d.total||d.balance||0),balance:Number(d.balance||Math.max(0,Number(d.total||0)-Number(d.paid||0))),paid:Number(d.paid||0),interestKnown:!!d.interestKnown,interestRate:d.interestRate||null,status:d.status||'Em aberto',minPayment:Number(d.minPayment||0),events:Array.isArray(d.history)?d.history.map(h=>({id:h.id||Models.uid('debt_event'),date:normalizeDate(h.date)||Models.today(),type:h.type||'Evento migrado',value:Number(h.value||0),note:h.note||'',effect:h.effect||'neutral'})):[]}));
    });
  }
  function migrateTasks(data){
    parse('tasks').forEach(t=>{
      data.tasks.push(Models.task({title:t.title||t.t||'Tarefa migrada',description:t.desc||'',projectId:projectForLegacy(data,t),section:t.section||t.status||'Entrada',dueDate:normalizeDate(t.due),priority:t.priority||legacyPriority(t.prio),labels:Array.isArray(t.labels)?t.labels:legacyLabels(t.tag),status:t.done?'Concluída':(t.status||'A Fazer'),done:!!t.done,comments:t.comments||[]}));
    });
  }
  function projectForLegacy(data,t){
    const name=t.project||t.list||'Inbox';
    let p=data.projects.find(x=>x.name===name);
    if(!p){p=Models.project({name:name,sections:['Entrada','A Fazer','Em andamento','Concluído']});data.projects.push(p);}
    return p.id;
  }
  function legacyPriority(p){if(['P1','P2','P3','P4'].includes(p))return p;if(p==='Alta')return'P1';if(p==='Média')return'P2';if(p==='Baixa')return'P3';return'P4';}
  function legacyLabels(tag){return tag?String(tag).split(/[ ,]+/).filter(Boolean).map(x=>x.replace(/^#/,'')):[];}
  function normalizeDate(v){
    if(!v||v==='Sem data'||v==='Sem prazo'||v==='Próximo ciclo')return null;
    if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v;
    if(/^\d{2}\/\d{2}\/\d{4}$/.test(v)){const[d,m,y]=v.split('/');return`${y}-${m}-${d}`;}
    if(v==='Hoje')return Models.today();
    return null;
  }
  return {migrateIfNeeded,oldKeyExists};
})();
