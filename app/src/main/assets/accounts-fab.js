// Contas financeiras + botão adicionar contextual.
// Este arquivo é carregado depois de app.js e finance-research.js.

function ensureAccountsSeed(){
  if(!localStorage.vpAccountsSeed){
    db.set('bills',[
      {name:'Energia',flow:'A_PAGAR',expected:180,final:0,due:'10/'+String(new Date().getMonth()+1).padStart(2,'0')+'/'+new Date().getFullYear(),cat:'Moradia',wallet:'Principal',status:'PENDENTE',repeat:'Mensal',notes:'Conta de luz'},
      {name:'Recebimento extra',flow:'A_RECEBER',expected:250,final:0,due:'15/'+String(new Date().getMonth()+1).padStart(2,'0')+'/'+new Date().getFullYear(),cat:'Receita extra',wallet:'Principal',status:'PENDENTE',repeat:'Nenhuma',notes:'Exemplo de conta a receber'}
    ]);
    localStorage.vpAccountsSeed='1';
  }
}
ensureAccountsSeed();

var vpCurrentScreen='home';

const oldHomeForContext=home;
home=function(){vpCurrentScreen='home';oldHomeForContext();};

const oldProdForContext=prod;
prod=function(){vpCurrentScreen='prod';oldProdForContext();};

const oldDebtsForContext=debts;
debts=function(){vpCurrentScreen='debts';oldDebtsForContext();};

const oldFinBeforeAccounts=fin;
fin=function(){
  vpCurrentScreen='fin';
  head('Minhas Finanças','Controle financeiro com transações, contas, orçamento, recorrências, previsão, patrimônio, metas, dívidas e relatórios.');
  let bal=sum('receita')-sum('despesa');
  let bills=db.get('bills',[]);
  let payable=bills.filter(b=>b.flow==='A_PAGAR'&&b.status==='PENDENTE').reduce((s,b)=>s+Number(b.expected||0),0);
  let receivable=bills.filter(b=>b.flow==='A_RECEBER'&&b.status==='PENDENTE').reduce((s,b)=>s+Number(b.expected||0),0);
  let mods=[
    ['Transações','Receitas, despesas e transferências','transactions'],
    ['Contas','Contas a pagar e a receber','accounts'],
    ['Categorias','Categorias e subcategorias','categories'],
    ['Carteiras','Contas bancárias, dinheiro, cartão e saldos','wallets'],
    ['Planejamento','Orçamento por categoria com alertas','budget'],
    ['Assinaturas','Recorrências e mensalidades','subscriptions'],
    ['Previsão','Saldo futuro e fluxo projetado','forecast'],
    ['Patrimônio','Ativos, passivos e valor líquido','netWorth'],
    ['Regras','Categorização automática local','rules'],
    ['Metas','Progresso de metas e aportes','goals'],
    ['Dívidas','Pagamentos e saldo devedor','debts'],
    ['Relatórios','Análises por categoria e fluxo','reports'],
    ['Exportação','Backup CSV local','exportData'],
    ['Importação','CSV manual','importView'],
    ['Configurações','Reset e dados locais','settings']
  ];
  app.innerHTML=`<div class="grid">${metric('Saldo',money(bal),bal>=0?'green':'red')}${metric('A pagar',money(payable),'red')}${metric('A receber',money(receivable),'green')}${metric('Dívidas',money(debtRest()),'amber')}</div>`+financeInsights()+mods.map(m=>`<div class="card" data-view="${m[2]}"><h3>${m[0]}</h3><p>${m[1]}</p></div>`).join('');
};

const oldFinanceInsights=financeInsights;
financeInsights=function(){
  let base=oldFinanceInsights();
  let bills=db.get('bills',[]);
  let payable=bills.filter(b=>b.flow==='A_PAGAR'&&b.status==='PENDENTE').reduce((s,b)=>s+Number(b.expected||0),0);
  let receivable=bills.filter(b=>b.flow==='A_RECEBER'&&b.status==='PENDENTE').reduce((s,b)=>s+Number(b.expected||0),0);
  let open=bills.filter(b=>b.status==='PENDENTE').slice(0,3).map(b=>`• ${esc(b.name)}: ${b.flow==='A_PAGAR'?'pagar':'receber'} ${money(b.expected)} em ${esc(b.due)}`).join('<br>');
  return base+card('Contas pendentes',open||'Nenhuma conta pendente.'+'<br>A pagar: '+money(payable)+'<br>A receber: '+money(receivable),'amber');
};

function accounts(){
  vpCurrentScreen='accounts';
  head('Contas','Contas a pagar e receber com vencimento, status e confirmação de valor final.');
  let a=db.get('bills',[]);
  let payable=a.filter(b=>b.flow==='A_PAGAR'&&b.status==='PENDENTE').reduce((s,b)=>s+Number(b.expected||0),0);
  let receivable=a.filter(b=>b.flow==='A_RECEBER'&&b.status==='PENDENTE').reduce((s,b)=>s+Number(b.expected||0),0);
  let paid=a.filter(b=>b.status!=='PENDENTE').reduce((s,b)=>s+Number(b.final||0),0);
  app.innerHTML=btn('+ Nova conta','bill','amber')+`<div class="grid">${metric('A pagar',money(payable),'red')}${metric('A receber',money(receivable),'green')}${metric('Liquidado',money(paid),'blue')}${metric('Total contas',String(a.length),'amber')}</div>`+(a.length?a.map((b,i)=>billItem(b,i)).join(''):empty('Nenhuma conta cadastrada.'));
}

function billItem(b,i){
  let isPay=b.flow==='A_PAGAR';
  let closed=b.status!=='PENDENTE';
  let c=closed?'green':(isPay?'red':'green');
  let actionLabel=isPay?'Confirmar pagamento':'Confirmar recebimento';
  return `<div class="item ${closed?'done':''}" style="border-left-color:var(--${c})"><h4>${closed?'✓':'○'} ${esc(b.name)}</h4><div class="meta">${isPay?'A pagar':'A receber'} • Previsto: ${money(b.expected)} • Final: ${money(b.final||0)}<br>Vencimento: ${esc(b.due)} • ${esc(b.cat)} • ${esc(b.wallet)} • ${esc(b.repeat)} • ${esc(b.status)}</div><div class="actions"><button class="mini primary" data-close-bill="${i}">${actionLabel}</button><button class="mini" data-dup-bill="${i}">Duplicar</button><button class="mini danger" data-del-bill="${i}">Excluir</button></div></div>`;
}

function billForm(){
  form('Nova conta',[{id:'name',label:'Nome da conta'},{id:'flow',label:'Tipo',options:['A_PAGAR','A_RECEBER']},{id:'expected',label:'Valor previsto'},{id:'due',label:'Vencimento',value:today()},{id:'cat',label:'Categoria',value:'Geral'},{id:'wallet',label:'Carteira',value:'Principal'},{id:'repeat',label:'Recorrência',options:['Nenhuma','Mensal','Semanal','Anual']},{id:'notes',label:'Observações'}],'saveBill');
}

function saveBill(){
  let a=db.get('bills',[]);
  a.push({name:val('name')||'Conta',flow:val('flow')||'A_PAGAR',expected:parseMoney(val('expected')),final:0,due:val('due')||today(),cat:val('cat')||'Geral',wallet:val('wallet')||'Principal',repeat:val('repeat')||'Nenhuma',notes:val('notes')||'',status:'PENDENTE'});
  db.set('bills',a);closeSheet();accounts();
}

function closeBill(i){
  let a=db.get('bills',[]);let b=a[i];if(!b)return;
  openSheet(`<h2>${b.flow==='A_PAGAR'?'Confirmar pagamento':'Confirmar recebimento'}</h2><label class="field"><span>Valor final</span><input id="billFinal" value="${String(b.expected).replace('.',',')}"></label><label class="field"><span>Data</span><input id="billDate" value="${today()}"></label><div class="row"><button class="btn alt" data-act="close">Cancelar</button><button class="btn" data-save-bill-close="${i}">Confirmar</button></div>`);
}

function saveBillClose(i){
  let a=db.get('bills',[]);let b=a[i];if(!b)return;
  let finalValue=parseMoney(val('billFinal'));
  b.final=finalValue;
  b.closedDate=val('billDate')||today();
  b.status=b.flow==='A_PAGAR'?'PAGO':'RECEBIDO';
  a[i]=b;db.set('bills',a);
  let tx=db.get('tx');
  tx.push({type:b.flow==='A_PAGAR'?'despesa':'receita',value:finalValue,desc:(b.flow==='A_PAGAR'?'Pagamento: ':'Recebimento: ')+b.name,cat:b.cat,wallet:b.wallet,date:b.closedDate});
  db.set('tx',tx);closeSheet();accounts();
}

function duplicateBill(i){
  let a=db.get('bills',[]);let b=a[i];if(!b)return;
  a.push({...b,status:'PENDENTE',final:0,closedDate:'',due:'Próximo ciclo'});
  db.set('bills',a);accounts();
}

const oldForecastForAccounts=forecast;
forecast=function(){
  vpCurrentScreen='forecast';
  head('Previsão','Saldo futuro considerando transações, contas, recorrências e dívidas.');
  let current=sum('receita')-sum('despesa');
  let recurring=db.get('subs',[]).filter(s=>s.status!=='Pausada').reduce((a,s)=>a+Number(s.value||0),0);
  let bills=db.get('bills',[]);
  let payable=bills.filter(b=>b.flow==='A_PAGAR'&&b.status==='PENDENTE').reduce((s,b)=>s+Number(b.expected||0),0);
  let receivable=bills.filter(b=>b.flow==='A_RECEBER'&&b.status==='PENDENTE').reduce((s,b)=>s+Number(b.expected||0),0);
  let projected=current+receivable-payable-recurring;
  let conservative=projected-debtRest();
  app.innerHTML=`<div class="grid">${metric('Saldo atual',money(current),current>=0?'green':'red')}${metric('A receber',money(receivable),'green')}${metric('A pagar',money(payable+recurring),'red')}${metric('Projetado',money(projected),projected>=0?'green':'red')}</div>`+card('Cenário conservador',`Após considerar dívidas em aberto: <b>${money(conservative)}</b>.`,'amber');
};

views.accounts=accounts;
acts.bill=billForm;
acts.saveBill=saveBill;

const viewNames=['inbox','lists','calendar','focus','habits','counts','kanban','timeline','stats','notes','search','transactions','categories','wallets','budget','goals','debts','reports','importView','settings','subscriptions','forecast','netWorth','rules','exportData','accounts'];
viewNames.forEach(function(name){
  if(views[name]){
    const original=views[name];
    views[name]=function(){vpCurrentScreen=name;return original();};
  }
});

function installContextFab(){
  let old=document.getElementById('fab');
  if(!old)return;
  let fresh=old.cloneNode(true);
  old.parentNode.replaceChild(fresh,old);
  fresh.addEventListener('click',contextAdd);
}

function contextAdd(){
  const map={
    home:function(){taskForm('Pessoal')},
    prod:function(){taskForm('Inbox')},
    inbox:function(){taskForm('Inbox')},
    lists:function(){taskForm('Pessoal')},
    calendar:function(){taskForm('Pessoal')},
    kanban:function(){taskForm('Pessoal')},
    timeline:function(){taskForm('Pessoal')},
    search:function(){taskForm('Inbox')},
    focus:focusForm,
    habits:habitForm,
    counts:countForm,
    notes:noteForm,
    stats:function(){taskForm('Pessoal')},
    fin:txForm,
    transactions:txForm,
    accounts:billForm,
    categories:categoryForm,
    wallets:walletForm,
    budget:budgetForm,
    subscriptions:subscriptionForm,
    forecast:billForm,
    netWorth:assetForm,
    rules:ruleForm,
    goals:goalForm,
    reports:txForm,
    importView:function(){document.getElementById('csv')?.focus()},
    settings:function(){fin()},
    debts:debtForm
  };
  let action=map[vpCurrentScreen]||map[route]||quickAdd;
  action();
}

document.body.addEventListener('click',function(e){
  let close=e.target.closest('[data-close-bill]');if(close){closeBill(Number(close.dataset.closeBill));return;}
  let save=e.target.closest('[data-save-bill-close]');if(save){saveBillClose(Number(save.dataset.saveBillClose));return;}
  let dup=e.target.closest('[data-dup-bill]');if(dup){duplicateBill(Number(dup.dataset.dupBill));return;}
  let del=e.target.closest('[data-del-bill]');if(del){let a=db.get('bills',[]);a.splice(Number(del.dataset.delBill),1);db.set('bills',a);accounts();return;}
});

installContextFab();
renderNav();
refresh();
