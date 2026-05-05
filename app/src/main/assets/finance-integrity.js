// Integridade financeira global.
// Fonte de verdade:
// 1) Transações movimentam carteiras/contas bancárias.
// 2) Contas a pagar/receber usam saldo pendente = previsto - liquidado.
// 3) Dívidas só afetam saldo quando pagas; renegociação cria contas futuras.
// 4) Gráficos, saldos e previsão usam os mesmos cálculos.

(function(){
  function asNumber(v){ return Number(v||0); }
  function round2(v){ return Math.round((Number(v||0)+Number.EPSILON)*100)/100; }
  function allTx(){ return db.get('tx',[]); }
  function allBills(){ return db.get('bills',[]); }
  function saveBills(a){ db.set('bills',a); }
  function allWallets(){
    let w=db.get('wallets',[]);
    if(!w.length) w=[{name:'Principal',type:'Conta Corrente',balance:0,include:true}];
    if(!w.find(x=>x.name==='Principal')) w.unshift({name:'Principal',type:'Conta Corrente',balance:0,include:true});
    db.set('wallets',w);
    return w;
  }

  function isClosedBill(b){ return ['PAGO','RECEBIDO','CANCELADA','CANCELADO'].includes(String(b.status||'').toUpperCase()); }
  function billSettled(b){
    if(isClosedBill(b)) return round2(asNumber(b.final)||asNumber(b.settled)||asNumber(b.expected));
    return round2(asNumber(b.settled));
  }
  function billRemaining(b){
    if(isClosedBill(b)) return 0;
    return Math.max(0,round2(asNumber(b.expected)-billSettled(b)));
  }
  function billFlowMatchesTx(b,type){ return (b.flow==='A_PAGAR'&&type==='despesa')||(b.flow==='A_RECEBER'&&type==='receita'); }
  function payablePending(){ return allBills().filter(b=>b.flow==='A_PAGAR').reduce((s,b)=>s+billRemaining(b),0); }
  function receivablePending(){ return allBills().filter(b=>b.flow==='A_RECEBER').reduce((s,b)=>s+billRemaining(b),0); }
  function paidBillsTotal(){ return allBills().filter(b=>b.flow==='A_PAGAR').reduce((s,b)=>s+billSettled(b),0); }
  function receivedBillsTotal(){ return allBills().filter(b=>b.flow==='A_RECEBER').reduce((s,b)=>s+billSettled(b),0); }

  function walletBalance(name){
    const wallet=allWallets().find(w=>w.name===name)||{balance:0};
    const initial=asNumber(wallet.balance);
    const mov=allTx().filter(t=>(t.wallet||'Principal')===name).reduce((s,t)=>{
      if(t.type==='receita') return s+asNumber(t.value);
      if(t.type==='despesa') return s-asNumber(t.value);
      return s;
    },0);
    return round2(initial+mov);
  }
  function totalWalletBalance(){
    return allWallets().filter(w=>w.include!==false).reduce((s,w)=>s+walletBalance(w.name),0);
  }
  function txIncome(){ return allTx().filter(t=>t.type==='receita').reduce((s,t)=>s+asNumber(t.value),0); }
  function txExpense(){ return allTx().filter(t=>t.type==='despesa').reduce((s,t)=>s+asNumber(t.value),0); }
  function txBalance(){ return round2(txIncome()-txExpense()); }

  window.vpFinanceIntegrity={
    billRemaining,billSettled,payablePending,receivablePending,paidBillsTotal,receivedBillsTotal,walletBalance,totalWalletBalance,txIncome,txExpense,txBalance
  };

  function debtIdFromBill(b){
    const m=String(b.notes||'').match(/dívida\s+(\d+)/i);
    return m?m[1]:null;
  }
  function reduceLinkedDebt(b,paidValue,balanceReduction,note){
    const id=debtIdFromBill(b);
    if(!id) return;
    const debts=db.get('debts',[]);
    const idx=debts.findIndex(d=>String(d.id)===String(id));
    if(idx<0) return;
    const d=debts[idx];
    d.paid=round2(asNumber(d.paid)+asNumber(paidValue));
    d.balance=Math.max(0,round2(asNumber(d.balance)-asNumber(balanceReduction)));
    if(d.balance<=0) d.status='Quitada'; else if(d.status==='Renegociada'||d.status==='Em negociação') d.status='Em pagamento';
    d.history=Array.isArray(d.history)?d.history:[];
    d.history.push({id:Date.now(),date:today(),type:'Pagamento de conta vinculada',value:asNumber(paidValue),note:note||'Conta vinculada à dívida foi liquidada.',effect:'transaction',balanceReduction:asNumber(balanceReduction)});
    debts[idx]=d;
    db.set('debts',debts);
  }

  function settleBillWithTransaction(index,value,type,date,desc){
    const bills=allBills();
    const b=bills[index];
    if(!b) return {ok:false,message:'Conta não encontrada.'};
    if(!billFlowMatchesTx(b,type)) return {ok:false,message:'Tipo de transação incompatível com a conta selecionada.'};
    const oldRemaining=billRemaining(b);
    const settledNow=Math.min(oldRemaining,asNumber(value));
    b.settled=round2(billSettled(b)+asNumber(value));
    b.final=round2(asNumber(b.final)+asNumber(value));
    b.lastSettlementDate=date||today();
    if(billRemaining(b)<=0||b.settled>=asNumber(b.expected)){
      b.status=b.flow==='A_PAGAR'?'PAGO':'RECEBIDO';
      b.closedDate=date||today();
      b.final=round2(b.settled);
    }else{
      b.status='PENDENTE';
      b.partial=true;
    }
    bills[index]=b;
    saveBills(bills);
    if(b.flow==='A_PAGAR') reduceLinkedDebt(b,value,settledNow,desc||'Pagamento de parcela/conta vinculada.');
    return {ok:true,bill:b,settledNow:settledNow};
  }

  function pendingBillOptions(){
    const bills=allBills();
    const opts=['Nenhuma'];
    bills.forEach((b,i)=>{
      const rem=billRemaining(b);
      if(rem>0) opts.push(`${i} | ${b.flow==='A_PAGAR'?'Pagar':'Receber'} | ${b.name} | ${money(rem)}`);
    });
    return opts;
  }
  function walletOptions(){ return allWallets().map(w=>w.name); }
  function categoryByRule(desc,cat){
    if(cat&&cat!=='Geral') return cat;
    const rules=db.get('rules',[]);
    const low=String(desc||'').toLowerCase();
    const r=rules.find(x=>low.includes(String(x.contains||'').toLowerCase()));
    return r?r.cat:(cat||'Geral');
  }

  window.txForm=function(){
    const billOpts=pendingBillOptions();
    form('Nova transação',[{id:'type',label:'Tipo',options:['despesa','receita']},{id:'value',label:'Valor'},{id:'desc',label:'Descrição'},{id:'cat',label:'Categoria',value:'Geral'},{id:'wallet',label:'Carteira/conta',options:walletOptions()},{id:'txBill',label:'Vincular conta pendente',options:billOpts}],'saveTx');
  };
  window.saveTx=function(){
    const type=val('type')||'despesa';
    const value=parseMoney(val('value'));
    if(value<=0){ alert('Informe um valor maior que zero.'); return; }
    const billRaw=val('txBill');
    const billIndex=billRaw&&billRaw!=='Nenhuma'?parseInt(billRaw.split('|')[0].trim(),10):-1;
    const bills=allBills();
    const linked=billIndex>=0?bills[billIndex]:null;
    if(linked&&!billFlowMatchesTx(linked,type)){ alert('A conta selecionada não combina com o tipo de transação. Use despesa para conta a pagar e receita para conta a receber.'); return; }
    const desc=val('desc')||(linked?linked.name:'Sem descrição');
    const cat=categoryByRule(desc,val('cat')||(linked?linked.cat:'Geral'));
    const wallet=val('wallet')||'Principal';
    const tx={type:type,value:value,desc:desc,cat:cat,wallet:wallet,date:today(),billId:linked?(linked.id||billIndex):null};
    const list=allTx(); list.push(tx); db.set('tx',list);
    if(linked) settleBillWithTransaction(billIndex,value,type,today(),'Transação vinculada: '+desc);
    closeSheet();
    if(vpCurrentScreen==='accounts') accounts(); else if(vpCurrentScreen==='transactions') transactions(); else if(route==='fin'||vpCurrentScreen==='fin') fin(); else refresh();
  };
  if(typeof acts!=='undefined'){
    acts.tx=txForm;
    acts.saveTx=saveTx;
  }

  function closeBillIntegrity(index){
    const bills=allBills();
    const b=bills[index];
    if(!b) return;
    const finalInput=document.getElementById('billFinal');
    const dateInput=document.getElementById('billDate');
    const value=parseMoney(finalInput?finalInput.value:String(billRemaining(b)).replace('.',','));
    if(value<=0){ alert('Informe o valor final pago/recebido.'); return; }
    const type=b.flow==='A_PAGAR'?'despesa':'receita';
    const date=dateInput?dateInput.value:today();
    const desc=(b.flow==='A_PAGAR'?'Pagamento: ':'Recebimento: ')+b.name;
    const beforeRemaining=billRemaining(b);
    const tx=allTx();
    tx.push({type:type,value:value,desc:desc,cat:b.cat||'Geral',wallet:b.wallet||'Principal',date:date,billId:b.id||index});
    db.set('tx',tx);
    b.settled=round2(billSettled(b)+value);
    b.final=round2(asNumber(b.final)+value);
    b.status=b.flow==='A_PAGAR'?'PAGO':'RECEBIDO';
    b.closedDate=date;
    b.partial=false;
    bills[index]=b;
    saveBills(bills);
    if(b.flow==='A_PAGAR') reduceLinkedDebt(b,value,beforeRemaining,'Conta vinculada liquidada manualmente.');
    closeSheet();
    accounts();
  }

  document.body.addEventListener('click',function(e){
    const save=e.target.closest('[data-save-bill-close]');
    if(save){
      e.preventDefault();
      e.stopImmediatePropagation();
      closeBillIntegrity(Number(save.dataset.saveBillClose));
    }
  },true);

  window.accounts=function(){
    vpCurrentScreen='accounts';
    head('Contas','Contas a pagar e receber com valor pendente, parcial e liquidado.');
    const bills=allBills();
    app.innerHTML=btn('+ Nova conta','bill','amber')+`<div class="grid">${metric('A pagar',money(payablePending()),'red')}${metric('A receber',money(receivablePending()),'green')}${metric('Pago',money(paidBillsTotal()),'blue')}${metric('Recebido',money(receivedBillsTotal()),'green')}</div>`+(bills.length?bills.map((b,i)=>billItemIntegrity(b,i)).join(''):empty('Nenhuma conta cadastrada.'));
  };
  function billItemIntegrity(b,i){
    const rem=billRemaining(b), settled=billSettled(b), closed=isClosedBill(b), isPay=b.flow==='A_PAGAR', c=closed?'green':(isPay?'red':'green');
    const label=isPay?'A pagar':'A receber';
    const action=isPay?'Confirmar pagamento':'Confirmar recebimento';
    return `<div class="item ${closed?'done':''}" style="border-left-color:var(--${c})"><h4>${closed?'✓':'○'} ${esc(b.name)}</h4><div class="meta">${label} • Previsto: ${money(b.expected)} • Liquidado: ${money(settled)} • Pendente: ${money(rem)}<br>Vencimento: ${esc(b.due)} • ${esc(b.cat)} • ${esc(b.wallet)} • ${esc(b.repeat)} • ${esc(b.status||'PENDENTE')}</div><div class="actions"><button class="mini primary" data-close-bill="${i}">${action}</button><button class="mini" data-dup-bill="${i}">Duplicar</button><button class="mini danger" data-del-bill="${i}">Excluir</button></div></div>`;
  }
  if(typeof views!=='undefined') views.accounts=accounts;

  window.wallets=function(){
    vpCurrentScreen='wallets';
    head('Carteiras','Saldos recalculados por transações: receitas somam, despesas subtraem.');
    const w=allWallets();
    app.innerHTML=btn('+ Nova carteira','wallet','green')+`<div class="grid">${metric('Saldo total',money(totalWalletBalance()),totalWalletBalance()>=0?'green':'red')}${metric('Receitas',money(txIncome()),'green')}${metric('Despesas',money(txExpense()),'red')}${metric('Carteiras',String(w.length),'blue')}</div>`+w.map((x,i)=>`<div class="item" style="border-left-color:var(--${walletBalance(x.name)>=0?'green':'red'})"><h4>${esc(x.name)}</h4><div class="meta">${esc(x.type)} • Saldo inicial: ${money(x.balance)} • Saldo atual: ${money(walletBalance(x.name))} • Incluir no total: ${x.include!==false?'Sim':'Não'}</div></div>`).join('');
  };
  if(typeof views!=='undefined') views.wallets=wallets;

  function categoryChartHtml(){
    const cats={};
    allTx().filter(t=>t.type==='despesa').forEach(t=>cats[t.cat||'Geral']=round2((cats[t.cat||'Geral']||0)+asNumber(t.value)));
    const entries=Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,4);
    const total=entries.reduce((s,e)=>s+e[1],0);
    const colors=['#dc2626','#d97706','#7c3aed','#2563eb'];
    return `<div class="mf-card"><h3>Despesas por categoria</h3><div class="mf-chart-row"><div class="mf-donut"></div><div class="mf-legend">${entries.length?entries.map((e,i)=>`<div><span><i class="mf-dot" style="background:${colors[i]}"></i>${esc(e[0])}</span><b class="mf-money">${money(e[1])}</b></div>`).join(''):'<p>Nenhuma despesa registrada.</p>'}<div><span>Total</span><b>${money(total)}</b></div></div></div></div>`;
  }
  function latestTxHtml(){
    const tx=allTx().slice().reverse().slice(0,5);
    return `<div class="mf-card"><h3>Últimos lançamentos</h3>${tx.length?`<div class="mf-list">${tx.map(t=>`<div class="mf-entry"><div class="mf-icon" style="background:${t.type==='receita'?'#dcfce7':'#fee2e2'}">${t.type==='receita'?'＋':'−'}</div><div><h4>${esc(t.desc)}</h4><small>${esc(t.cat)} • ${esc(t.wallet)} • ${esc(t.date)}</small></div><strong class="${t.type==='receita'?'mf-income':'mf-expense'}">${money(t.value)}</strong></div>`).join('')}</div>`:'<p>Nenhum lançamento.</p>'}<div class="actions"><button class="mini primary" data-view="transactions">Ver extrato</button></div></div>`;
  }
  function billsPreviewHtml(){
    const bills=allBills().filter(b=>billRemaining(b)>0).slice(0,5);
    return `<div class="mf-card"><h3>Contas pendentes</h3>${bills.length?`<div class="mf-list">${bills.map(b=>`<div class="mf-entry"><div class="mf-icon" style="background:${b.flow==='A_PAGAR'?'#fee2e2':'#dcfce7'}">${b.flow==='A_PAGAR'?'↓':'↑'}</div><div><h4>${esc(b.name)}</h4><small>${esc(b.due)} • liquidado ${money(billSettled(b))}</small></div><strong class="${b.flow==='A_PAGAR'?'mf-expense':'mf-income'}">${money(billRemaining(b))}</strong></div>`).join('')}</div>`:'<p>Nenhuma conta pendente.</p>'}<div class="actions"><button class="mini primary" data-view="accounts">Ver contas</button></div></div>`;
  }
  function walletsPreviewHtml(){
    const w=allWallets().slice(0,3);
    return `<div class="mf-card"><h3>Contas e carteiras</h3>${w.map(x=>`<div class="mf-entry"><div class="mf-icon" style="background:#dbeafe">$</div><div><h4>${esc(x.name)}</h4><small>${esc(x.type)}</small></div><strong class="${walletBalance(x.name)>=0?'mf-income':'mf-expense'}">${money(walletBalance(x.name))}</strong></div>`).join('')}<div class="actions"><button class="mini primary" data-view="wallets">Ver carteiras</button></div></div>`;
  }

  window.fin=function(){
    vpCurrentScreen='fin';
    head('Finanças','Saldos, contas, carteiras, dívidas e gráficos sincronizados.');
    const bal=totalWalletBalance();
    const privateOn=localStorage.vpPrivateMode==='1';
    const month=new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase());
    app.innerHTML=`<div class="mf-page ${privateOn?'mf-private':''}"><section class="mf-hero"><div class="mf-topline"><div class="mf-brand">VivoPreco Finanças</div><button class="mf-private-toggle" data-act="togglePrivate">${privateOn?'Mostrar':'Privado'}</button></div><button class="mf-period">${month}</button><div class="mf-balance-label">Saldo atual das carteiras</div><div class="mf-balance mf-money">${money(bal)}</div><div class="mf-hero-grid"><div class="mf-mini"><span>Receitas</span><strong>${money(txIncome())}</strong></div><div class="mf-mini"><span>Despesas</span><strong>${money(txExpense())}</strong></div><div class="mf-mini"><span>A receber</span><strong>${money(receivablePending())}</strong></div><div class="mf-mini"><span>A pagar</span><strong>${money(payablePending())}</strong></div></div></section><section class="mf-tabs"><button class="on">Resumo</button><button data-view="transactions">Extrato</button><button data-view="accounts">Contas</button><button data-view="wallets">Carteiras</button><button data-view="mfCards">Cartões</button><button data-view="budget">Orçamento</button><button data-view="reports">Relatórios</button></section><section class="mf-section">${financeIntegritySummary()}${quickFinanceActions()}${categoryChartHtml()}${walletsPreviewHtml()}${billsPreviewHtml()}${latestTxHtml()}${debtIntegrationHtml()}</section></div>`;
  };
  function financeIntegritySummary(){
    const projected=round2(totalWalletBalance()+receivablePending()-payablePending()-minimumDebtNotBilled());
    return `<div class="debt-card"><h3>Auditoria de saldos</h3><p>Carteiras: <b>${money(totalWalletBalance())}</b><br>Projetado após contas e dívidas mínimas: <b>${money(projected)}</b><br>Os gráficos usam somente transações reais.</p></div>`;
  }
  function quickFinanceActions(){
    return `<div class="mf-actions"><button class="mf-action" data-act="tx"><b>＋</b><span>Transação</span></button><button class="mf-action" data-act="bill"><b>🧾</b><span>Conta</span></button><button class="mf-action" data-act="wallet"><b>🏦</b><span>Carteira</span></button><button class="mf-action" data-go="debts"><b>⚠</b><span>Dívida</span></button></div>`;
  }
  function minimumDebtNotBilled(){
    const debts=db.get('debts',[]);
    return debts.filter(d=>d.status!=='Quitada'&&!(d.linkedBills&&d.linkedBills.length)).reduce((s,d)=>s+asNumber(d.minPayment),0);
  }
  function debtIntegrationHtml(){
    return `<div class="debt-card"><h3>Dívidas integradas</h3><p>Saldo vivo: <b>${money(debtRest())}</b><br>Pagamentos de dívidas aparecem como despesas em Transações.<br>Renegociações parceladas aparecem em Contas a pagar.</p><div class="actions"><button class="mini primary" data-go="debts">Abrir dívidas</button><button class="mini" data-view="forecast">Ver previsão</button></div></div>`;
  }

  window.forecast=function(){
    vpCurrentScreen='forecast';
    head('Previsão','Cálculo baseado em carteiras, contas pendentes, recorrências e dívidas.');
    const recurring=db.get('subs',[]).filter(s=>s.status!=='Pausada').reduce((a,s)=>a+asNumber(s.value),0);
    const minDebt=minimumDebtNotBilled();
    const projected=round2(totalWalletBalance()+receivablePending()-payablePending()-recurring-minDebt);
    app.innerHTML=`<div class="grid">${metric('Carteiras',money(totalWalletBalance()),totalWalletBalance()>=0?'green':'red')}${metric('A receber',money(receivablePending()),'green')}${metric('A pagar',money(payablePending()+recurring),'red')}${metric('Mín. dívidas',money(minDebt),'amber')}</div>`+card('Saldo projetado',`Depois de contas, recorrências e dívidas mínimas: <b>${money(projected)}</b>.`,projected>=0?'green':'amber');
  };
  if(typeof views!=='undefined') views.forecast=forecast;

  window.reports=function(){
    vpCurrentScreen='reports';
    head('Relatórios','Relatórios calculados a partir de transações reais e contas pendentes.');
    const cat={};
    allTx().filter(t=>t.type==='despesa').forEach(t=>cat[t.cat||'Geral']=round2((cat[t.cat||'Geral']||0)+asNumber(t.value)));
    app.innerHTML=card('Fluxo realizado',`Receitas: ${money(txIncome())}<br>Despesas: ${money(txExpense())}<br>Resultado: ${money(txBalance())}`,'blue')+card('Contas pendentes',`A pagar: ${money(payablePending())}<br>A receber: ${money(receivablePending())}`,'amber')+card('Carteiras',`Saldo total recalculado: ${money(totalWalletBalance())}`,'green')+card('Dívidas',`Saldo vivo: ${money(debtRest())}<br>Mínimo sem acordo: ${money(minimumDebtNotBilled())}`,'red')+card('Gastos por categoria',Object.keys(cat).map(k=>`${esc(k)}: ${money(cat[k])}`).join('<br>')||'Sem despesas.','red');
  };
  if(typeof views!=='undefined') views.reports=reports;

  if(typeof acts!=='undefined'){
    acts.togglePrivate=function(){ localStorage.vpPrivateMode=localStorage.vpPrivateMode==='1'?'0':'1'; fin(); };
  }

  const oldContext=window.contextAdd;
  window.contextAdd=function(){
    if(vpCurrentScreen==='fin') return txForm();
    if(vpCurrentScreen==='accounts') return billForm();
    if(vpCurrentScreen==='wallets') return walletForm();
    if(vpCurrentScreen==='reports') return txForm();
    return oldContext?oldContext():quickAdd();
  };

  renderNav();
  refresh();
})();
