window.PlanningEngine=(function(){
  const n=v=>Number(v||0);
  const r=v=>Math.round((n(v)+Number.EPSILON)*100)/100;
  function ensure(data){
    data.categories=Array.isArray(data.categories)?data.categories:seedCategories();
    data.budgets=Array.isArray(data.budgets)?data.budgets:[];
    data.goals=Array.isArray(data.goals)?data.goals:[];
    data.cards=Array.isArray(data.cards)?data.cards:[];
    return data;
  }
  function seedCategories(){return [{id:'cat_food',name:'Alimentação',type:'despesa'},{id:'cat_home',name:'Moradia',type:'despesa'},{id:'cat_debt',name:'Dívidas',type:'despesa'},{id:'cat_income',name:'Receita',type:'receita'},{id:'cat_general',name:'Geral',type:'ambos'}];}
  function addCategory(data,input){ensure(data);const c={id:Models.uid('cat'),name:Validators.safeText(input.name||'Categoria',80),type:Validators.oneOf(input.type||'despesa',['despesa','receita','ambos'],'Tipo da categoria')};data.categories.push(c);return c;}
  function deleteCategory(data,id){ensure(data);const c=data.categories.find(x=>x.id===id);if(!c)throw new Error('Categoria não encontrada.');if((data.transactions||[]).some(t=>t.category===c.name))throw new Error('Categoria usada por transações não pode ser excluída.');data.categories=data.categories.filter(x=>x.id!==id);return c;}
  function addBudget(data,input){ensure(data);const b={id:Models.uid('budget'),category:Validators.safeText(input.category||'Geral',80),month:input.month||new Date().toISOString().slice(0,7),limit:Validators.positiveNumber(input.limit,'Limite do orçamento')};data.budgets.push(b);return b;}
  function budgetSpent(data,budget){return r((data.transactions||[]).filter(t=>t.type==='despesa'&&t.category===budget.category&&String(t.date||'').slice(0,7)===budget.month).reduce((s,t)=>s+n(t.value),0));}
  function addGoal(data,input){ensure(data);const g={id:Models.uid('goal'),name:Validators.safeText(input.name||'Meta',120),target:Validators.positiveNumber(input.target,'Valor da meta'),saved:n(input.saved||0),deadline:input.deadline||null,status:'Ativa'};data.goals.push(g);return g;}
  function contributeGoal(data,id,value){ensure(data);const g=data.goals.find(x=>x.id===id);if(!g)throw new Error('Meta não encontrada.');g.saved=r(n(g.saved)+Validators.positiveNumber(value,'Valor guardado'));if(g.saved>=g.target)g.status='Concluída';return g;}
  function deleteGoal(data,id){ensure(data);data.goals=data.goals.filter(g=>g.id!==id);}
  function addCard(data,input){ensure(data);const c={id:Models.uid('card'),name:Validators.safeText(input.name||'Cartão',80),limit:Validators.positiveNumber(input.limit,'Limite do cartão'),closingDay:Math.min(31,Math.max(1,parseInt(input.closingDay||1,10))),dueDay:Math.min(31,Math.max(1,parseInt(input.dueDay||10,10))),walletId:input.walletId||FinanceEngine.defaultWalletId(data),active:true};data.cards.push(c);return c;}
  function deleteCard(data,id){ensure(data);data.cards=data.cards.filter(c=>c.id!==id);}
  return {ensure,seedCategories,addCategory,deleteCategory,addBudget,budgetSpent,addGoal,contributeGoal,deleteGoal,addCard,deleteCard};
})();
