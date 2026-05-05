window.FinanceEngine=(function(){
  const n=v=>Number(v||0);
  const r=v=>Math.round((n(v)+Number.EPSILON)*100)/100;
  function transactions(data){return data.transactions||[];}
  function wallets(data){return data.wallets||[];}
  function bills(data){return data.bills||[];}
  function income(data){return r(transactions(data).filter(t=>t.type==='receita').reduce((s,t)=>s+n(t.value),0));}
  function expense(data){return r(transactions(data).filter(t=>t.type==='despesa').reduce((s,t)=>s+n(t.value),0));}
  function walletBalance(data,walletId){
    const w=wallets(data).find(x=>x.id===walletId);
    const initial=n(w&&w.initialBalance);
    const flow=transactions(data).reduce((s,t)=>{
      if(t.type==='receita'&&t.walletId===walletId)return s+n(t.value);
      if(t.type==='despesa'&&t.walletId===walletId)return s-n(t.value);
      if(t.type==='transferencia'&&t.fromWalletId===walletId)return s-n(t.value);
      if(t.type==='transferencia'&&t.toWalletId===walletId)return s+n(t.value);
      return s;
    },0);
    return r(initial+flow);
  }
  function totalWalletBalance(data){return r(wallets(data).filter(w=>w.includeInTotal!==false).reduce((s,w)=>s+walletBalance(data,w.id),0));}
  function billSettled(b){return r(n(b.settled)||n(b.finalValue));}
  function billRemaining(b){if(['PAGO','RECEBIDO','CANCELADO'].includes(String(b.status||'').toUpperCase()))return 0;return Math.max(0,r(n(b.expected)-billSettled(b)));}
  function payable(data){return r(bills(data).filter(b=>b.flow==='A_PAGAR').reduce((s,b)=>s+billRemaining(b),0));}
  function receivable(data){return r(bills(data).filter(b=>b.flow==='A_RECEBER').reduce((s,b)=>s+billRemaining(b),0));}
  function ensureWallet(data,walletId){const id=walletId||defaultWalletId(data);if(!wallets(data).find(w=>w.id===id))data.wallets.push(Models.wallet({id:id,name:id==='wallet_main'?'Principal':id}));return id;}
  function defaultWalletId(data){return (data.preferences&&data.preferences.defaultWalletId)||'wallet_main';}
  function transactionById(data,id){return transactions(data).find(t=>t.id===id);}
  function addTransaction(data,input){
    const type=Validators.oneOf(input.type||'despesa',['despesa','receita'],'Tipo da transação');
    const value=Validators.positiveNumber(input.value,'Valor da transação');
    const walletId=ensureWallet(data,input.walletId);
    const tx=Models.transaction({type,value,walletId,description:Validators.safeText(input.description||'Sem descrição',160),category:Validators.safeText(input.category||'Geral',80),date:input.date||Models.today(),billId:input.billId||null,debtId:input.debtId||null});
    data.transactions.push(tx);return tx;
  }
  function updateTransaction(data,txId,input){
    const tx=transactionById(data,txId);if(!tx)throw new Error('Transação não encontrada.');
    if(tx.billId||tx.debtId)throw new Error('Transação vinculada a conta ou dívida não deve ser editada diretamente. Edite a origem do lançamento.');
    if(tx.type==='transferencia'){
      if(input.value!==undefined)tx.value=Validators.positiveNumber(input.value,'Valor da transferência');
      if(input.fromWalletId!==undefined)tx.fromWalletId=ensureWallet(data,input.fromWalletId);
      if(input.toWalletId!==undefined)tx.toWalletId=ensureWallet(data,input.toWalletId);
      if(tx.fromWalletId===tx.toWalletId)throw new Error('Carteira de origem e destino devem ser diferentes.');
      if(input.description!==undefined)tx.description=Validators.safeText(input.description||'Transferência',160);
      if(input.date!==undefined)tx.date=input.date||tx.date;
      tx.walletId=tx.fromWalletId;
      return tx;
    }
    if(input.type!==undefined)tx.type=Validators.oneOf(input.type,['despesa','receita'],'Tipo da transação');
    if(input.value!==undefined)tx.value=Validators.positiveNumber(input.value,'Valor da transação');
    if(input.walletId!==undefined)tx.walletId=ensureWallet(data,input.walletId);
    if(input.description!==undefined)tx.description=Validators.safeText(input.description||'Sem descrição',160);
    if(input.category!==undefined)tx.category=Validators.safeText(input.category||'Geral',80);
    if(input.date!==undefined)tx.date=input.date||tx.date;
    return tx;
  }
  function deleteTransaction(data,txId){
    const idx=transactions(data).findIndex(t=>t.id===txId);if(idx<0)throw new Error('Transação não encontrada.');
    const tx=data.transactions[idx];
    if(tx.billId||tx.debtId)throw new Error('Transação vinculada a conta ou dívida não deve ser excluída diretamente para não quebrar o histórico.');
    data.transactions.splice(idx,1);return tx;
  }
  function addTransfer(data,input){
    const value=Validators.positiveNumber(input.value,'Valor da transferência');
    const fromWalletId=ensureWallet(data,input.fromWalletId);
    const toWalletId=ensureWallet(data,input.toWalletId);
    if(fromWalletId===toWalletId)throw new Error('Carteira de origem e destino devem ser diferentes.');
    const tx=Models.transaction({type:'transferencia',value,fromWalletId,toWalletId,walletId:fromWalletId,description:Validators.safeText(input.description||'Transferência',160),category:'Transferência',date:input.date||Models.today()});
    data.transactions.push(tx);return tx;
  }
  function addBill(data,input){
    const flow=Validators.oneOf(input.flow||'A_PAGAR',['A_PAGAR','A_RECEBER'],'Tipo da conta');
    const expected=Validators.positiveNumber(input.expected,'Valor previsto');
    const walletId=ensureWallet(data,input.walletId);
    const b=Models.bill({name:Validators.safeText(input.name||'Conta',120),flow,expected,walletId,dueDate:input.dueDate||Models.today(),category:Validators.safeText(input.category||'Geral',80),debtId:input.debtId||null});
    data.bills.push(b);return b;
  }
  function updateBill(data,billId,input){
    const b=data.bills.find(x=>x.id===billId);if(!b)throw new Error('Conta não encontrada');
    if(input.name!==undefined)b.name=Validators.safeText(input.name||b.name,120);
    if(input.flow!==undefined)b.flow=Validators.oneOf(input.flow,['A_PAGAR','A_RECEBER'],'Tipo da conta');
    if(input.expected!==undefined)b.expected=Validators.positiveNumber(input.expected,'Valor previsto');
    if(input.dueDate!==undefined)b.dueDate=input.dueDate||b.dueDate;
    if(input.category!==undefined)b.category=Validators.safeText(input.category||'Geral',80);
    if(input.walletId!==undefined)b.walletId=ensureWallet(data,input.walletId);
    return b;
  }
  function deleteBill(data,billId){const idx=data.bills.findIndex(b=>b.id===billId);if(idx<0)throw new Error('Conta não encontrada');const b=data.bills[idx];if(billSettled(b)>0)throw new Error('Não é seguro excluir conta já liquidada. Cancele ou mantenha o histórico.');data.bills.splice(idx,1);return b;}
  function settleBill(data,billId,value,date){
    const b=data.bills.find(x=>x.id===billId);if(!b)throw new Error('Conta não encontrada');
    const remaining=billRemaining(b);if(remaining<=0)throw new Error('Conta já liquidada.');
    const amount=Math.min(Validators.positiveNumber(value,'Valor da liquidação'),remaining);
    b.settled=r(n(b.settled)+amount);b.finalValue=r(n(b.finalValue)+amount);
    if(billRemaining(b)<=0){b.status=b.flow==='A_PAGAR'?'PAGO':'RECEBIDO';b.closedAt=date||Models.today();}else{b.status='PENDENTE';}
    const tx=addTransaction(data,{type:b.flow==='A_PAGAR'?'despesa':'receita',value:amount,description:(b.flow==='A_PAGAR'?'Pagamento: ':'Recebimento: ')+b.name,category:b.category,walletId:b.walletId,date:date||Models.today(),billId:b.id,debtId:b.debtId||null});
    return {bill:b,transaction:tx,amount};
  }
  function projectedBalance(data,minDebtPayment){return r(totalWalletBalance(data)+receivable(data)-payable(data)-n(minDebtPayment));}
  return {income,expense,walletBalance,totalWalletBalance,billSettled,billRemaining,payable,receivable,transactionById,addTransaction,updateTransaction,deleteTransaction,addTransfer,addBill,updateBill,deleteBill,settleBill,projectedBalance,defaultWalletId};
})();
