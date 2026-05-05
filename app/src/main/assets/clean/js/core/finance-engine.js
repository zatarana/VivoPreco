window.FinanceEngine=(function(){
  const n=v=>Number(v||0);
  const r=v=>Math.round((n(v)+Number.EPSILON)*100)/100;
  function transactions(data){return data.transactions||[];}
  function wallets(data){return data.wallets||[];}
  function bills(data){return data.bills||[];}
  function income(data){return r(transactions(data).filter(t=>t.type==='receita').reduce((s,t)=>s+n(t.value),0));}
  function expense(data){return r(transactions(data).filter(t=>t.type==='despesa').reduce((s,t)=>s+n(t.value),0));}
  function walletBalance(data,walletId){const w=wallets(data).find(x=>x.id===walletId);const initial=n(w&&w.initialBalance);const flow=transactions(data).filter(t=>t.walletId===walletId).reduce((s,t)=>s+(t.type==='receita'?n(t.value):-n(t.value)),0);return r(initial+flow);}
  function totalWalletBalance(data){return r(wallets(data).filter(w=>w.includeInTotal!==false).reduce((s,w)=>s+walletBalance(data,w.id),0));}
  function billSettled(b){return r(n(b.settled)||n(b.finalValue));}
  function billRemaining(b){if(['PAGO','RECEBIDO','CANCELADO'].includes(String(b.status||'').toUpperCase()))return 0;return Math.max(0,r(n(b.expected)-billSettled(b)));}
  function payable(data){return r(bills(data).filter(b=>b.flow==='A_PAGAR').reduce((s,b)=>s+billRemaining(b),0));}
  function receivable(data){return r(bills(data).filter(b=>b.flow==='A_RECEBER').reduce((s,b)=>s+billRemaining(b),0));}
  function addTransaction(data,input){const tx=Models.transaction(input);data.transactions.push(tx);return tx;}
  function addBill(data,input){const b=Models.bill(input);data.bills.push(b);return b;}
  function settleBill(data,billId,value,date){const b=data.bills.find(x=>x.id===billId);if(!b)throw new Error('Conta não encontrada');const amount=n(value);if(amount<=0)throw new Error('Valor inválido');b.settled=r(n(b.settled)+amount);b.finalValue=r(n(b.finalValue)+amount);if(billRemaining(b)<=0){b.status=b.flow==='A_PAGAR'?'PAGO':'RECEBIDO';b.closedAt=date||Models.today();}const tx=addTransaction(data,{type:b.flow==='A_PAGAR'?'despesa':'receita',value:amount,description:(b.flow==='A_PAGAR'?'Pagamento: ':'Recebimento: ')+b.name,category:b.category,walletId:b.walletId,date:date||Models.today(),billId:b.id,debtId:b.debtId||null});return {bill:b,transaction:tx};}
  function projectedBalance(data,minDebtPayment){return r(totalWalletBalance(data)+receivable(data)-payable(data)-n(minDebtPayment));}
  return {income,expense,walletBalance,totalWalletBalance,billSettled,billRemaining,payable,receivable,addTransaction,addBill,settleBill,projectedBalance};
})();
