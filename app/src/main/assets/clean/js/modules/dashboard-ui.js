window.DashboardUI=(function(){
  function render(data){
    Dom.setHeader('Início','Resumo limpo calculado por engines centrais.');
    const projected=FinanceEngine.projectedBalance(data,DebtEngine.minPayment(data));
    Dom.render(`<div class="grid">${Components.metric('Saldo',Dom.money(FinanceEngine.totalWalletBalance(data)),FinanceEngine.totalWalletBalance(data)>=0?'success':'danger')}${Components.metric('A pagar',Dom.money(FinanceEngine.payable(data)),'danger')}${Components.metric('A receber',Dom.money(FinanceEngine.receivable(data)),'success')}${Components.metric('Dívidas',Dom.money(DebtEngine.total(data)),'warning')}</div>${Components.card('Auditoria limpa',`Receitas reais: <b>${Dom.money(FinanceEngine.income(data))}</b><br>Despesas reais: <b>${Dom.money(FinanceEngine.expense(data))}</b><br>Saldo projetado: <b>${Dom.money(projected)}</b>`)}${Components.card('Clean Core','Esta tela usa Storage + Engines + UI separados. A versão antiga continua intacta até a migração final.')}`);
  }
  return {render};
})();
