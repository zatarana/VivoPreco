window.IntegrationEngine=(function(){
  function install(){
    if(!window.FinanceEngine||!window.DebtEngine||FinanceEngine.__integrated)return;
    FinanceEngine.__integrated=true;
  }
  return {install};
})();
