// Complemento de pesquisa: remove a aba Mais e adiciona funcionalidades financeiras inspiradas em padrões de mercado.
// Mantém tudo local/offline dentro do WebView.

function ensureFinanceResearchSeed(){
  if(!localStorage.vpFinanceResearchSeed){
    db.set('subs',[
      {name:'Internet',value:99.90,due:'10',cat:'Moradia',status:'Ativa'},
      {name:'Streaming',value:29.90,due:'15',cat:'Lazer',status:'Ativa'}
    ]);
    db.set('rules',[
      {contains:'mercado',cat:'Alimentação'},
      {contains:'uber',cat:'Transporte'},
      {contains:'farmácia',cat:'Saúde'}
    ]);
    db.set('assets',[{name:'Reserva em dinheiro',type:'Ativo',value:150},{name:'Saldo devedor inicial',type:'Passivo',value:debtRest()}]);
    localStorage.vpFinanceResearchSeed='1';
  }
}
ensureFinanceResearchSeed();

renderNav=function(){
  const items=[['home','Hoje'],['prod','Prod.'],['fin','Finanças'],['debts','Dívidas']];
  nav.innerHTML=items.map(i=>`<button class="${route===i[0]?'active':''}" data-go="${i[0]}">${i[1]}</button>`).join('');
};

go=function(r){
  if(r==='more') r='fin';
  route=r;
  renderNav();
  ({home,prod,fin,debts}[r]||home)();
};

refresh=function(){
  if(route==='home') home();
  else if(route==='fin') fin();
  else if(route==='debts') debts();
  else prod();
};

fin=function(){
  head('Minhas Finanças','Controle financeiro local inspirado em boas práticas de apps como orçamento por categoria, recorrências, previsão, patrimônio, regras e exportação.');
  let bal=sum('receita')-sum('despesa');
  let mods=[
    ['Transações','Receitas, despesas, transferências e regras','transactions'],
    ['Categorias','Categorias e subcategorias','categories'],
    ['Carteiras','Contas, dinheiro, cartão e saldos','wallets'],
    ['Planejamento','Orçamento por categoria com alertas','budget'],
    ['Assinaturas','Contas recorrentes e mensalidades','subscriptions'],
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
  app.innerHTML=`<div class="grid">${metric('Saldo',money(bal),bal>=0?'green':'red')}${metric('Receitas',money(sum('receita')),'green')}${metric('Despesas',money(sum('despesa')),'red')}${metric('Dívidas',money(debtRest()),'amber')}</div>`+financeInsights()+mods.map(m=>`<div class="card" data-view="${m[2]}"><h3>${m[0]}</h3><p>${m[1]}</p></div>`).join('');
};

function financeInsights(){
  let tx=db.get('tx');
  let monthExpense=sum('despesa');
  let subs=db.get('subs',[]).filter(s=>s.status!=='Pausada').reduce((a,s)=>a+Number(s.value||0),0);
  let budgets=db.get('budgets',[]);
  let alerts=[];
  budgets.forEach(b=>{
    let spent=tx.filter(t=>t.type==='despesa'&&t.cat===b.cat).reduce((s,t)=>s+Number(t.value||0),0);
    let pct=b.limit?Math.round(spent/b.limit*100):0;
    if(pct>=100) alerts.push(`Limite ultrapassado em ${esc(b.cat)} (${pct}%).`);
    else if(pct>=80) alerts.push(`Atenção: ${esc(b.cat)} já chegou a ${pct}% do orçamento.`);
  });
  if(subs>0) alerts.push(`Recorrências previstas no mês: ${money(subs)}.`);
  return card('Insights rápidos',alerts.join('<br>')||'Sem alertas financeiros no momento.','blue');
}

function subscriptions(){
  head('Assinaturas','Contas recorrentes, mensalidades e lembretes de vencimento.');
  let a=db.get('subs',[]);
  let total=a.filter(s=>s.status!=='Pausada').reduce((x,s)=>x+Number(s.value||0),0);
  app.innerHTML=btn('+ Nova assinatura','subscription','amber')+card('Custo mensal recorrente',money(total),'amber')+(a.length?a.map((s,i)=>`<div class="item" style="border-left-color:var(--amber)"><h4>${esc(s.name)}</h4><div class="meta">${money(s.value)} • vence dia ${esc(s.due)} • ${esc(s.cat)} • ${esc(s.status)}</div><div class="actions"><button class="mini primary" data-pay-sub="${i}">Lançar pagamento</button><button class="mini" data-toggle-sub="${i}">${s.status==='Pausada'?'Ativar':'Pausar'}</button><button class="mini danger" data-del-extra="subs:${i}:subscriptions">Excluir</button></div></div>`).join(''):empty('Nenhuma assinatura.'));
}

function forecast(){
  head('Previsão','Saldo futuro considerando transações, recorrências e dívidas.');
  let current=sum('receita')-sum('despesa');
  let recurring=db.get('subs',[]).filter(s=>s.status!=='Pausada').reduce((a,s)=>a+Number(s.value||0),0);
  let openDebt=debtRest();
  let projected=current-recurring;
  let conservative=projected-Math.min(openDebt, recurring*2);
  app.innerHTML=`<div class="grid">${metric('Saldo atual',money(current),current>=0?'green':'red')}${metric('Recorrências',money(recurring),'amber')}${metric('Projetado',money(projected),projected>=0?'green':'red')}${metric('Conservador',money(conservative),conservative>=0?'green':'red')}</div>`+card('Leitura','A previsão usa os dados locais cadastrados. Ela não substitui conciliação bancária, mas ajuda a decidir antes de gastar.','blue');
}

function netWorth(){
  head('Patrimônio','Ativos, passivos e patrimônio líquido.');
  let a=db.get('assets',[]);
  let assets=a.filter(x=>x.type==='Ativo').reduce((s,x)=>s+Number(x.value||0),0)+Math.max(0,sum('receita')-sum('despesa'));
  let liabilities=a.filter(x=>x.type==='Passivo').reduce((s,x)=>s+Number(x.value||0),0)+debtRest();
  let net=assets-liabilities;
  app.innerHTML=btn('+ Novo ativo/passivo','asset','purple')+`<div class="grid">${metric('Ativos',money(assets),'green')}${metric('Passivos',money(liabilities),'red')}${metric('Líquido',money(net),net>=0?'green':'red')}${metric('Dívidas',money(debtRest()),'amber')}</div>`+(a.length?a.map((x,i)=>`<div class="item" style="border-left-color:var(--${x.type==='Ativo'?'green':'red'})"><h4>${esc(x.name)}</h4><div class="meta">${esc(x.type)} • ${money(x.value)}</div><div class="actions"><button class="mini danger" data-del-extra="assets:${i}:netWorth">Excluir</button></div></div>`).join(''):empty('Nenhum ativo/passivo.'));
}

function rulesView(){ rules(); }
function rules(){
  head('Regras de categoria','Categorização automática local por texto da descrição.');
  let a=db.get('rules',[]);
  app.innerHTML=btn('+ Nova regra','rule')+card('Como funciona','Ao importar ou criar transações, uma regra pode sugerir categoria quando a descrição contém determinada palavra.','blue')+(a.length?a.map((r,i)=>`<div class="item"><h4>Se contém: ${esc(r.contains)}</h4><div class="meta">Categoria sugerida: ${esc(r.cat)}</div><div class="actions"><button class="mini danger" data-del-extra="rules:${i}:rules">Excluir</button></div></div>`).join(''):empty('Nenhuma regra.'));
}

function exportData(){
  head('Exportação','Gere CSV textual para copiar e salvar.');
  let rows=['tipo;valor;descricao;categoria;carteira;data'];
  db.get('tx').forEach(t=>rows.push([t.type,t.value,t.desc,t.cat,t.wallet,t.date].map(v=>String(v??'').replace(/;/g,',')).join(';')));
  app.innerHTML=card('Exportação CSV','Copie o conteúdo abaixo e salve como <b>vivopreco.csv</b>.','green')+`<div class="code">${esc(rows.join('\n'))}</div>`;
}

function subscriptionForm(){
  form('Nova assinatura',[{id:'name',label:'Nome'},{id:'value',label:'Valor mensal'},{id:'due',label:'Dia do vencimento',value:'10'},{id:'cat',label:'Categoria',value:'Assinaturas'},{id:'status',label:'Status',options:['Ativa','Pausada']}],'saveSubscription');
}
function saveSubscription(){
  let a=db.get('subs',[]);
  a.push({name:val('name')||'Assinatura',value:parseMoney(val('value')),due:val('due')||'1',cat:val('cat')||'Assinaturas',status:val('status')||'Ativa'});
  db.set('subs',a);closeSheet();subscriptions();
}
function assetForm(){
  form('Novo ativo/passivo',[{id:'name',label:'Nome'},{id:'type',label:'Tipo',options:['Ativo','Passivo']},{id:'value',label:'Valor'}],'saveAsset');
}
function saveAsset(){
  let a=db.get('assets',[]);
  a.push({name:val('name')||'Item patrimonial',type:val('type')||'Ativo',value:parseMoney(val('value'))});
  db.set('assets',a);closeSheet();netWorth();
}
function ruleForm(){
  form('Nova regra',[{id:'contains',label:'Descrição contém'},{id:'cat',label:'Categoria sugerida'}],'saveRule');
}
function saveRule(){
  let a=db.get('rules',[]);
  a.push({contains:(val('contains')||'').toLowerCase(),cat:val('cat')||'Geral'});
  db.set('rules',a);closeSheet();rules();
}
function paySubscription(i){
  let a=db.get('subs',[]);let s=a[i];if(!s)return;
  let tx=db.get('tx');tx.push({type:'despesa',value:Number(s.value||0),desc:'Pagamento recorrente: '+s.name,cat:s.cat,wallet:'Principal',date:today()});
  db.set('tx',tx);subscriptions();
}
function toggleSubscription(i){
  let a=db.get('subs',[]);if(!a[i])return;a[i].status=a[i].status==='Pausada'?'Ativa':'Pausada';db.set('subs',a);subscriptions();
}

views.subscriptions=subscriptions;
views.forecast=forecast;
views.netWorth=netWorth;
views.rules=rules;
views.exportData=exportData;
acts.subscription=subscriptionForm;
acts.saveSubscription=saveSubscription;
acts.asset=assetForm;
acts.saveAsset=saveAsset;
acts.rule=ruleForm;
acts.saveRule=saveRule;

document.body.addEventListener('click',function(e){
  let sub=e.target.closest('[data-pay-sub]'); if(sub){paySubscription(Number(sub.dataset.paySub));return;}
  let tog=e.target.closest('[data-toggle-sub]'); if(tog){toggleSubscription(Number(tog.dataset.toggleSub));return;}
  let del=e.target.closest('[data-del-extra]');
  if(del){let [k,i,view]=del.dataset.delExtra.split(':');let a=db.get(k,[]);a.splice(Number(i),1);db.set(k,a);({subscriptions,netWorth,rules}[view]||fin)();return;}
});

renderNav();
if(route==='more') route='fin';
refresh();
