window.FinanceMonthlyUI=(function(){
  const n=v=>Number(v||0);
  const r=v=>Math.round((n(v)+Number.EPSILON)*100)/100;
  let touchStartX=0;
  function currentMonth(){return new Date().toISOString().slice(0,7);}
  function monthLabel(month){const [y,m]=String(month||currentMonth()).split('-').map(Number);const d=new Date(y,m-1,1);return d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase());}
  function shiftMonth(month,delta){const [y,m]=String(month||currentMonth()).split('-').map(Number);const d=new Date(y,m-1,1);d.setMonth(d.getMonth()+delta);return d.toISOString().slice(0,7);}
  function inMonth(date,month){return String(date||'').slice(0,7)===month;}
  function walletName(data,id){return ((data.wallets||[]).find(w=>w.id===id)||{}).name||'Conta financeira';}
  function billRemaining(b){return FinanceEngine.billRemaining(b);}
  function billSettled(b){return FinanceEngine.billSettled(b);}
  function monthTransactions(data,month){return (data.transactions||[]).filter(t=>inMonth(t.date,month));}
  function dueBillsInMonth(data,month){return (data.bills||[]).filter(b=>inMonth(b.dueDate,month));}
  function billTransactionsInMonth(data,month){return (data.transactions||[]).filter(t=>t.billId&&inMonth(t.date,month));}
  function realIncome(txs){return r(txs.filter(t=>t.type==='receita').reduce((s,t)=>s+n(t.value),0));}
  function realExpense(txs){return r(txs.filter(t=>t.type==='despesa').reduce((s,t)=>s+n(t.value),0));}
  function transferTotal(txs){return r(txs.filter(t=>t.type==='transferencia').reduce((s,t)=>s+n(t.value),0));}
  function pendingPay(bills){return r(bills.filter(b=>b.flow==='A_PAGAR'&&billRemaining(b)>0).reduce((s,b)=>s+billRemaining(b),0));}
  function pendingReceive(bills){return r(bills.filter(b=>b.flow==='A_RECEBER'&&billRemaining(b)>0).reduce((s,b)=>s+billRemaining(b),0));}
  function plannedPay(bills){return r(bills.filter(b=>b.flow==='A_PAGAR').reduce((s,b)=>s+n(b.expected),0));}
  function plannedReceive(bills){return r(bills.filter(b=>b.flow==='A_RECEBER').reduce((s,b)=>s+n(b.expected),0));}
  function realizedBillPay(txs){return r(txs.filter(t=>t.type==='despesa').reduce((s,t)=>s+n(t.value),0));}
  function realizedBillReceive(txs){return r(txs.filter(t=>t.type==='receita').reduce((s,t)=>s+n(t.value),0));}
  function byCategory(txs){const map={};txs.filter(t=>t.type==='despesa').forEach(t=>{const k=t.category||'Geral';map[k]=r((map[k]||0)+n(t.value));});return map;}
  function byWallet(txs,data){const map={};txs.forEach(t=>{if(t.type==='transferencia'){map[walletName(data,t.fromWalletId)]=r((map[walletName(data,t.fromWalletId)]||0)-n(t.value));map[walletName(data,t.toWalletId)]=r((map[walletName(data,t.toWalletId)]||0)+n(t.value));}else{const sign=t.type==='receita'?1:-1;map[walletName(data,t.walletId)]=r((map[walletName(data,t.walletId)]||0)+sign*n(t.value));}});return map;}
  function barList(map){const keys=Object.keys(map).sort((a,b)=>Math.abs(map[b])-Math.abs(map[a]));if(!keys.length)return Components.empty('Sem dados neste mês.');const max=Math.max(1,...keys.map(k=>Math.abs(map[k])));return keys.map(k=>{const pct=Math.min(100,Math.round((Math.abs(map[k])/max)*100));return `<div class="item compact-item"><h4>${Dom.esc(k)}</h4><div class="meta">${Dom.money(map[k])}</div><div class="progress"><span style="width:${pct}%"></span></div></div>`;}).join('');}
  function txItem(data,t){
    if(t.type==='transferencia')return `<div class="item compact-item"><h4>${Dom.esc(t.description||'Transferência')}</h4><div class="meta">${walletName(data,t.fromWalletId)} → ${walletName(data,t.toWalletId)} • ${Dom.date(t.date)} • ${Dom.money(t.value)}</div><div class="actions compact-actions">${Components.mini('Editar','editTransaction',t.id)}${Components.mini('Excluir','deleteTransaction',t.id,'danger')}</div></div>`;
    return `<div class="item compact-item ${t.type==='receita'?'success-accent':'danger-accent'}"><h4>${Dom.esc(t.description||'Transação')}</h4><div class="meta">${t.type==='receita'?'Receita':'Despesa'} real • ${Dom.esc(t.category||'Geral')} • ${walletName(data,t.walletId)} • ${Dom.date(t.date)} • ${Dom.money(t.value)}</div>${t.billId||t.debtId?'<div class="meta">Realizada a partir de conta pendente/dívida.</div>':`<div class="actions compact-actions">${Components.mini('Editar','editTransaction',t.id)}${Components.mini('Excluir','deleteTransaction',t.id,'danger')}</div>`}</div>`;
  }
  function billItem(data,b,selectedMonth){const rem=billRemaining(b);const settled=billSettled(b);const status=rem<=0?'Liquidada':settled>0?'Parcial':'Pendente';return `<div class="item compact-item ${rem<=0?'success-accent':b.flow==='A_PAGAR'?'danger-accent':'success-accent'}"><h4>${Dom.esc(b.name)}</h4><div class="meta">${b.flow==='A_PAGAR'?'A pagar':'A receber'} previsto para ${Dom.date(b.dueDate)} • Previsto ${Dom.money(b.expected)} • Já liquidado ${Dom.money(settled)} • Ainda pendente ${Dom.money(rem)} • ${status}</div>${rem<=0?'<div class="meta">Se foi liquidada antecipadamente, o valor real aparece no mês da transação/pagamento, não necessariamente neste mês previsto.</div>':''}<div class="actions compact-actions">${rem>0?Components.mini('Liquidar','settleBillForm',b.id,'primary'):''}${Components.mini('Editar','editBill',b.id)}</div></div>`;}
  function render(data,month){
    const selected=month||currentMonth();
    const txs=monthTransactions(data,selected);
    const dueBills=dueBillsInMonth(data,selected);
    const billTxs=billTransactionsInMonth(data,selected);
    const income=realIncome(txs);
    const expense=realExpense(txs);
    const net=r(income-expense);
    const transfers=transferTotal(txs);
    const pPay=pendingPay(dueBills);
    const pReceive=pendingReceive(dueBills);
    const plannedOut=plannedPay(dueBills);
    const plannedIn=plannedReceive(dueBills);
    const realizedOutFromBills=realizedBillPay(billTxs);
    const realizedInFromBills=realizedBillReceive(billTxs);
    const realNow=FinanceEngine.totalWalletBalance(data);
    const estimatedAfterMonthPendencies=r(realNow+pReceive-pPay);
    Dom.setHeader('Mensal financeiro','Previsto por vencimento, realizado por data real de pagamento/recebimento.');
    Dom.render(`<section id="monthlyFinanceView" class="monthly-view"><div class="month-switch"><button class="mini" data-action="monthlyFinance:${shiftMonth(selected,-1)}">‹</button><div><h2>${Dom.esc(monthLabel(selected))}</h2><p class="meta">Mês selecionado: ${Dom.esc(selected)}</p></div><button class="mini" data-action="monthlyFinance:${shiftMonth(selected,1)}">›</button></div><div class="grid compact-grid">${Components.metric('Saldo real atual',Dom.money(realNow),realNow>=0?'success':'danger')}${Components.metric('Estimado se pendências do mês liquidarem',Dom.money(estimatedAfterMonthPendencies),estimatedAfterMonthPendencies>=0?'success':'danger')}${Components.metric('Resultado real do mês',Dom.money(net),net>=0?'success':'danger')}${Components.metric('Transações reais',String(txs.length),'primary')}</div><div class="grid compact-grid">${Components.metric('Receitas reais no mês',Dom.money(income),'success')}${Components.metric('Despesas reais no mês',Dom.money(expense),'danger')}${Components.metric('A receber ainda pendente no mês',Dom.money(pReceive),'success')}${Components.metric('A pagar ainda pendente no mês',Dom.money(pPay),'danger')}</div><div class="grid compact-grid">${Components.metric('Previsto receber no mês',Dom.money(plannedIn),'success')}${Components.metric('Previsto pagar no mês',Dom.money(plannedOut),'danger')}${Components.metric('Realizado de contas neste mês',Dom.money(realizedInFromBills-realizedOutFromBills),(realizedInFromBills-realizedOutFromBills)>=0?'success':'danger')}${Components.metric('Transferências',Dom.money(transfers),'primary')}</div>${Components.card('Regra da tela mensal','Vencimento define onde a pendência aparece como prevista. Data de pagamento/recebimento define onde o dinheiro aparece como realizado. Se você pagar junho em maio, a despesa real entra em maio; junho só mostra a pendência prevista já liquidada.')}<h2 class="section">Pendências previstas para este mês</h2>${dueBills.length?dueBills.sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate))).map(b=>billItem(data,b,selected)).join(''):Components.empty('Nenhuma pendência prevista para este mês.')}<h2 class="section">Transações reais deste mês</h2>${txs.length?txs.slice().reverse().map(t=>txItem(data,t)).join(''):Components.empty('Nenhuma transação real neste mês.')}<h2 class="section">Despesas reais por categoria</h2>${barList(byCategory(txs))}<h2 class="section">Movimento real por conta financeira</h2>${barList(byWallet(txs,data))}</section>`);
    installSwipe(selected);
  }
  function installSwipe(month){setTimeout(()=>{const el=Dom.$('#monthlyFinanceView');if(!el)return;el.ontouchstart=e=>{touchStartX=e.changedTouches&&e.changedTouches[0]?e.changedTouches[0].screenX:0;};el.ontouchend=e=>{const end=e.changedTouches&&e.changedTouches[0]?e.changedTouches[0].screenX:touchStartX;const diff=end-touchStartX;if(Math.abs(diff)<60)return;if(diff<0)render(StorageService.read(),shiftMonth(month,1));else render(StorageService.read(),shiftMonth(month,-1));};},0);}
  return {render,currentMonth,shiftMonth,monthTransactions,monthBills:dueBillsInMonth,dueBillsInMonth,billTransactionsInMonth};
})();
