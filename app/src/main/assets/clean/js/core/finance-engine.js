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
  function ensureWallet(data,walletId){const id=walletId||'wallet_main';if(!wallets(data).find(w=>w.id===id))data.wallets.push(Models.wallet({id:id,name:id==='wallet_main'?'Principal':id}));return id;}
  function addTransaction(data,input){
    const type=Validators.oneOf(input.type||'despesa',['despesa','receita'],'Tipo da transação');
    const value=Validators.positiveNumber(input.value,'Valor da transação');
    const walletId=ensureWallet(data,input.walletId);
    const tx=Models.transaction({type,value,walletId,description:Validators.safeText(input.description||'Sem descrição',160),category:Validators.safeText(input.category||'Geral',80),date:input.date||Models.today(),billId:input.billId||null,debtId:input.debtId||null});
    data.transactions.push(tx);return tx;
  }
  function addBill(data,input){
    const flow=Validators.oneOf(input.flow||'A_PAGAR',['A_PAGAR','A_RECEBER'],'Tipo da conta');
    const expected=Validators.positiveNumber(input.expected,'Valor previsto');
    const walletId=ensureWallet(data,input.walletId);
    const b=Models.bill({name:Validators.safeText(input.name||'Conta',120),flow,expected,walletId,dueDate:input.dueDate||Models.today(),category:Validators.safeText(input.category||'Geral',80),debtId:input.debtId||null});
    data.bills.push(b);return b;
  }
  function settleBill(data,billId,value,date){
    const b=data.bills.find(x=>x.id===billId);if(!b)throw new Error('Conta não encontrada');
    const remaining=billRemaining(b);if(remaining<=0)throw new Error('Conta já liquidada.');
    const amount=Math.min(Validators.positiveNumber(value,'Valor da liquidação'),remaining);
    b.settled=r(n(b.settled)+amount);b.finalValue=r(n(b.finalValue)+amount);
    if(billRemaining(b)<=0){b.status=b.flow==='A_PAGAR'?'PAGO':'RECEBIDO';b.closedAt=date||Models.today();}
    const tx=addTransaction(data,{type:b.flow==='A_PAGAR'?'despesa':'receita',value:amount,description:(b.flow==='A_PAGAR'?'Pagamento: ':'Recebimento: ')+b.name,category:b.category,walletId:b.walletId,date:date||Models.today(),billId:b.id,debtId:b.debtId||null});
    return {bill:b,transaction:tx};
  }
  function projectedBalance(data,minDebtPayment){return r(totalWalletBalance(data)+receivable(data)-payable(data)-n(minDebtPayment));}
  return {income,expense,walletBalance,totalWalletBalance,billSettled,billRemaining,payable,receivable,addTransaction,addBill,settleBill,projectedBalance};
})();
