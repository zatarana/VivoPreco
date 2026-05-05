window.FinanceReportUI=(function(){
  const n=v=>Number(v||0);
  const r=v=>Math.round((n(v)+Number.EPSILON)*100)/100;
  function iso(date){return date.toISOString().slice(0,10);}
  function today(){return iso(new Date());}
  function addDays(days){const d=new Date();d.setDate(d.getDate()+days);return iso(d);}
  function monthStart(){const d=new Date();d.setDate(1);return iso(d);}
  function yearStart(){const d=new Date();d.setMonth(0,1);return iso(d);}
  function weekStart(){const d=new Date();const day=d.getDay();const diff=day===0?-6:1-day;d.setDate(d.getDate()+diff);return iso(d);}
  function rangeInfo(range){
    const key=String(range||'month');
    if(key==='today')return {key,label:'Hoje',start:today(),end:today()};
    if(key==='week')return {key,label:'Semana',start:weekStart(),end:today()};
    if(key==='month')return {key,label:'Mês',start:monthStart(),end:today()};
    if(key==='year')return {key,label:'Ano',start:yearStart(),end:today()};
    if(key==='7')return {key,label:'Últimos 7 dias',start:addDays(-6),end:today()};
    if(key==='30')return {key,label:'Últimos 30 dias',start:addDays(-29),end:today()};
    return {key:'all',label:'Geral',start:null,end:null};
  }
  function inRange(date,info){if(!info.start)return true;const d=String(date||today()).slice(0,10);return d>=info.start&&d<=info.end;}
  function periodTransactions(data,info){return (data.transactions||[]).filter(t=>inRange(t.date,info));}
  function periodBills(data,info){return (data.bills||[]).filter(b=>inRange(b.dueDate,info));}
  function income(txs){return r(txs.filter(t=>t.type==='receita').reduce((s,t)=>s+n(t.value),0));}
  function expense(txs){return r(txs.filter(t=>t.type==='despesa').reduce((s,t)=>s+n(t.value),0));}
  function transfers(txs){return r(txs.filter(t=>t.type==='transferencia').reduce((s,t)=>s+n(t.value),0));}
  function byCategory(txs){const map={};txs.filter(t=>t.type==='despesa').forEach(t=>{const k=t.category||'Geral';map[k]=r((map[k]||0)+n(t.value));});return map;}
  function byWallet(data,txs){const map={};txs.forEach(t=>{if(t.type==='transferencia'){map[walletName(data,t.fromWalletId)]=r((map[walletName(data,t.fromWalletId)]||0)-n(t.value));map[walletName(data,t.toWalletId)]=r((map[walletName(data,t.toWalletId)]||0)+n(t.value));}else{const sign=t.type==='receita'?1:-1;map[walletName(data,t.walletId)]=r((map[walletName(data,t.walletId)]||0)+sign*n(t.value));}});return map;}
  function walletName(data,id){return ((data.wallets||[]).find(w=>w.id===id)||{}).name||'Carteira';}
  function rangeButtons(active){const opts=[['today','Hoje'],['week','Semana'],['month','Mês'],['year','Ano'],['7','7 dias'],['30','30 dias'],['all','Geral']];return `<div class="row wrap">${opts.map(o=>`<button class="mini ${String(active)===o[0]?'primary':''}" data-action="financeReportRange:${o[0]}">${o[1]}</button>`).join('')}</div>`;}
  function barList(map,total){const keys=Object.keys(map).sort((a,b)=>map[b]-map[a]);if(!keys.length)return Components.empty('Nenhum dado neste período.');const max=Math.max(1,...keys.map(k=>Math.abs(map[k])));return keys.map(k=>{const pct=Math.min(100,Math.round((Math.abs(map[k])/max)*100));return `<div class="item"><h4>${Dom.esc(k)}</h4><div class="meta">${Dom.money(map[k])}</div><div class="progress"><span style="width:${pct}%"></span></div></div>`;}).join('');}
  function txItem(data,t){
    if(t.type==='transferencia')return `<div class="item"><h4>${Dom.esc(t.description||'Transferência')}</h4><div class="meta">${walletName(data,t.fromWalletId)} → ${walletName(data,t.toWalletId)} • ${Dom.date(t.date)} • ${Dom.money(t.value)}</div></div>`;
    return `<div class="item ${t.type==='receita'?'success-accent':'danger-accent'}"><h4>${Dom.esc(t.description||'Transação')}</h4><div class="meta">${Dom.esc(t.category||'Geral')} • ${walletName(data,t.walletId)} • ${Dom.date(t.date)} • ${Dom.money(t.value)}</div></div>`;
  }
  function render(data,range){
    const info=rangeInfo(range);
    const txs=periodTransactions(data,info);
    const bills=periodBills(data,info);
    const inc=income(txs), exp=expense(txs), net=r(inc-exp), transf=transfers(txs);
    const payable=r(bills.filter(b=>b.flow==='A_PAGAR').reduce((s,b)=>s+FinanceEngine.billRemaining(b),0));
    const receivable=r(bills.filter(b=>b.flow==='A_RECEBER').reduce((s,b)=>s+FinanceEngine.billRemaining(b),0));
    Dom.setHeader('Relatório financeiro',`Período: ${info.label}`);
    Dom.render(`${rangeButtons(info.key)}<div class="grid">${Components.metric('Receitas',Dom.money(inc),'success')}${Components.metric('Despesas',Dom.money(exp),'danger')}${Components.metric('Resultado',Dom.money(net),net>=0?'success':'danger')}${Components.metric('Transferido',Dom.money(transf),'primary')}</div><div class="grid">${Components.metric('A receber',Dom.money(receivable),'success')}${Components.metric('A pagar',Dom.money(payable),'danger')}${Components.metric('Saldo atual',Dom.money(FinanceEngine.totalWalletBalance(data)),FinanceEngine.totalWalletBalance(data)>=0?'success':'danger')}${Components.metric('Lançamentos',String(txs.length),'primary')}</div><h2 class="section">Despesas por categoria</h2>${barList(byCategory(txs),exp)}<h2 class="section">Movimento por carteira</h2>${barList(byWallet(data,txs),Math.abs(net))}<h2 class="section">Transações do período</h2>${txs.length?txs.slice().reverse().map(t=>txItem(data,t)).join(''):Components.empty('Nenhuma transação neste período.')}`);
  }
  function install(){if(window.FinanceUI)window.FinanceUI.showFinanceReport=function(data,range){render(data||StorageService.read(),range||'month');};}
  setTimeout(install,0);
  return {render,rangeInfo,periodTransactions,periodBills};
})();
