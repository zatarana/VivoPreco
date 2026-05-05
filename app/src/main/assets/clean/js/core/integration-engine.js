window.IntegrationEngine=(function(){
  function install(){
    if(!window.FinanceEngine||!window.DebtEngine||!FinanceEngine.settleBill||FinanceEngine.__integrated)return;
    const originalSettleBill=FinanceEngine.settleBill;
    FinanceEngine.settleBill=function(data,billId,value,date){
      const result=originalSettleBill(data,billId,value,date);
      const bill=result&&result.bill;
      if(bill&&bill.debtId&&bill.flow==='A_PAGAR'&&DebtEngine.applyBillSettlement){
        DebtEngine.applyBillSettlement(data,bill.debtId,result.amount||result.transaction.value,result.amount||result.transaction.value,'Conta vinculada liquidada: '+bill.name);
      }
      return result;
    };
    FinanceEngine.__integrated=true;
  }
  return {install};
})();
