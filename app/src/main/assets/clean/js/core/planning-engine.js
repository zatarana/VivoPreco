window.PlanningEngine=(function(){
  const n=v=>Number(v||0);
  const r=v=>Math.round((n(v)+Number.EPSILON)*100)/100;
  function ensure(data){
    data.categories=Array.isArray(data.categories)?data.categories:seedCategories();
    data.budgets=Array.isArray(data.budgets)?data.budgets:[];
    data.goals=Array.isArray(data.goals)?data.goals:[];
    data.cards=Array.isArray(data.cards)?data.cards:[];
    data.cardPurchases=Array.isArray(data.cardPurchases)?data.cardPurchases:[];
    data.cardPurchases=data.cardPurchases.map(p=>Object.assign({installments:1,installmentNumber:1,totalValue:n(p.value),billId:null,invoiceMonth:String(p.date||Models.today()).slice(0,7)},p));
    return data;
  }
  function seedCategories(){return [{id:'cat_food',name:'Alimentação',type:'despesa'},{id:'cat_home',name:'Moradia',type:'despesa'},{id:'cat_debt',name:'Dívidas',type:'despesa'},{id:'cat_income',name:'Receita',type:'receita'},{id:'cat_general',name:'Geral',type:'ambos'}];}
  function categoryById(data,id){ensure(data);return data.categories.find(c=>c.id===id);}
  function budgetById(data,id){ensure(data);return data.budgets.find(b=>b.id===id);}
  function goalById(data,id){ensure(data);return data.goals.find(g=>g.id===id);}
  function cardById(data,id){ensure(data);return data.cards.find(c=>c.id===id);}
  function purchaseById(data,id){ensure(data);return data.cardPurchases.find(p=>p.id===id);}
  function duplicateCategory(data,name,id){return data.categories.some(c=>c.id!==id&&String(c.name).trim().toLowerCase()===String(name).trim().toLowerCase());}
  function addCategory(data,input){ensure(data);const name=Validators.safeText(input.name||'Categoria',80);if(duplicateCategory(data,name))throw new Error('Já existe uma categoria com esse nome.');const c={id:Models.uid('cat'),name,type:Validators.oneOf(input.type||'despesa',['despesa','receita','ambos'],'Tipo da categoria')};data.categories.push(c);return c;}
  function updateCategory(data,id,input){ensure(data);const c=categoryById(data,id);if(!c)throw new Error('Categoria não encontrada.');const oldName=c.name;if(input.name!==undefined){const name=Validators.safeText(input.name||oldName,80);if(duplicateCategory(data,name,id))throw new Error('Já existe uma categoria com esse nome.');c.name=name;if(oldName!==name){(data.transactions||[]).forEach(t=>{if(t.category===oldName)t.category=name;});(data.bills||[]).forEach(b=>{if(b.category===oldName)b.category=name;});(data.budgets||[]).forEach(b=>{if(b.category===oldName)b.category=name;});(data.cardPurchases||[]).forEach(p=>{if(p.category===oldName)p.category=name;});}}
    if(input.type!==undefined)c.type=Validators.oneOf(input.type||c.type,['despesa','receita','ambos'],'Tipo da categoria');return c;}
  function deleteCategory(data,id){ensure(data);const c=categoryById(data,id);if(!c)throw new Error('Categoria não encontrada.');if((data.transactions||[]).some(t=>t.category===c.name)||(data.bills||[]).some(b=>b.category===c.name)||(data.budgets||[]).some(b=>b.category===c.name)||(data.cardPurchases||[]).some(p=>p.category===c.name))throw new Error('Categoria usada por transações, contas, compras ou orçamentos não pode ser excluída. Edite a categoria ou remova os vínculos primeiro.');data.categories=data.categories.filter(x=>x.id!==id);return c;}
  function addBudget(data,input){ensure(data);const b={id:Models.uid('budget'),category:Validators.safeText(input.category||'Geral',80),month:input.month||new Date().toISOString().slice(0,7),limit:Validators.positiveNumber(input.limit,'Limite do orçamento')};data.budgets.push(b);return b;}
  function updateBudget(data,id,input){ensure(data);const b=budgetById(data,id);if(!b)throw new Error('Orçamento não encontrado.');if(input.category!==undefined)b.category=Validators.safeText(input.category||b.category,80);if(input.month!==undefined)b.month=input.month||b.month;if(input.limit!==undefined)b.limit=Validators.positiveNumber(input.limit,'Limite do orçamento');return b;}
  function deleteBudget(data,id){ensure(data);const idx=data.budgets.findIndex(b=>b.id===id);if(idx<0)throw new Error('Orçamento não encontrado.');const removed=data.budgets[idx];data.budgets.splice(idx,1);return removed;}
  function budgetSpent(data,budget){return r((data.transactions||[]).filter(t=>t.type==='despesa'&&t.category===budget.category&&String(t.date||'').slice(0,7)===budget.month).reduce((s,t)=>s+n(t.value),0));}
  function copyBudgetsFromPreviousMonth(data,targetMonth){ensure(data);const month=targetMonth||new Date().toISOString().slice(0,7);const d=new Date(month+'-01T00:00:00');d.setMonth(d.getMonth()-1);const prev=d.toISOString().slice(0,7);const created=[];data.budgets.filter(b=>b.month===prev).forEach(b=>{if(!data.budgets.some(x=>x.month===month&&x.category===b.category)){created.push(addBudget(data,{category:b.category,month,limit:b.limit}));}});return created;}
  function addGoal(data,input){ensure(data);const g={id:Models.uid('goal'),name:Validators.safeText(input.name||'Meta',120),target:Validators.positiveNumber(input.target,'Valor da meta'),saved:n(input.saved||0),deadline:input.deadline||null,status:n(input.saved||0)>=n(input.target)?'Concluída':'Ativa'};data.goals.push(g);return g;}
  function updateGoal(data,id,input){ensure(data);const g=goalById(data,id);if(!g)throw new Error('Meta não encontrada.');if(input.name!==undefined)g.name=Validators.safeText(input.name||g.name,120);if(input.target!==undefined)g.target=Validators.positiveNumber(input.target,'Valor da meta');if(input.saved!==undefined)g.saved=Math.max(0,r(n(input.saved)));if(input.deadline!==undefined)g.deadline=input.deadline||null;if(input.status!==undefined)g.status=Validators.safeText(input.status||g.status,40);if(g.saved>=g.target)g.status='Concluída';else if(g.status==='Concluída')g.status='Ativa';return g;}
  function contributeGoal(data,id,value){ensure(data);const g=goalById(data,id);if(!g)throw new Error('Meta não encontrada.');g.saved=r(n(g.saved)+Validators.positiveNumber(value,'Valor guardado'));if(g.saved>=g.target)g.status='Concluída';return g;}
  function deleteGoal(data,id){ensure(data);const idx=data.goals.findIndex(g=>g.id===id);if(idx<0)throw new Error('Meta não encontrada.');const removed=data.goals[idx];data.goals.splice(idx,1);return removed;}
  function addCard(data,input){ensure(data);const c={id:Models.uid('card'),name:Validators.safeText(input.name||'Cartão',80),limit:Validators.positiveNumber(input.limit,'Limite do cartão'),closingDay:Math.min(31,Math.max(1,parseInt(input.closingDay||1,10))),dueDay:Math.min(31,Math.max(1,parseInt(input.dueDay||10,10))),walletId:input.walletId||FinanceEngine.defaultWalletId(data),active:input.active!==false};data.cards.push(c);return c;}
  function updateCard(data,id,input){ensure(data);const c=cardById(data,id);if(!c)throw new Error('Cartão não encontrado.');if(input.name!==undefined)c.name=Validators.safeText(input.name||c.name,80);if(input.limit!==undefined)c.limit=Validators.positiveNumber(input.limit,'Limite do cartão');if(input.closingDay!==undefined)c.closingDay=Math.min(31,Math.max(1,parseInt(input.closingDay||c.closingDay,10)));if(input.dueDay!==undefined)c.dueDay=Math.min(31,Math.max(1,parseInt(input.dueDay||c.dueDay,10)));if(input.walletId!==undefined)c.walletId=input.walletId||c.walletId;if(input.active!==undefined)c.active=!!input.active;return c;}
  function deleteCard(data,id){ensure(data);const idx=data.cards.findIndex(c=>c.id===id);if(idx<0)throw new Error('Cartão não encontrado.');if(data.cardPurchases.some(p=>p.cardId===id&&!p.billId))throw new Error('Cartão com compras abertas não pode ser excluído. Feche a fatura ou exclua as compras primeiro.');const removed=data.cards[idx];data.cards.splice(idx,1);return removed;}
  function addCardPurchase(data,input){
    ensure(data);const card=cardById(data,input.cardId);if(!card)throw new Error('Cartão não encontrado.');if(card.active===false)throw new Error('Cartão inativo.');
    const total=Validators.positiveNumber(input.value,'Valor da compra');
    const count=Math.max(1,parseInt(input.installments||1,10));
    const base=r(total/count);
    const groupId=Models.uid('card_purchase_group');
    const firstMonth=input.invoiceMonth||invoiceMonthFor(card,input.date||Models.today());
    const created=[];
    for(let i=1;i<=count;i++){
      const value=i===count?r(total-base*(count-1)):base;
      const p={id:Models.uid('card_purchase'),groupId,cardId:card.id,description:Validators.safeText(input.description||'Compra no cartão',160),category:Validators.safeText(input.category||'Geral',80),value,date:input.date||Models.today(),installments:count,installmentNumber:i,totalValue:total,invoiceMonth:addMonthsToMonth(firstMonth,i-1),billId:null,createdAt:Models.today()};
      data.cardPurchases.push(p);created.push(p);
    }
    return count===1?created[0]:created;
  }
  function updateCardPurchase(data,id,input){ensure(data);const p=purchaseById(data,id);if(!p)throw new Error('Compra não encontrada.');if(p.billId)throw new Error('Compra já fechada em fatura não deve ser editada diretamente.');if(input.description!==undefined)p.description=Validators.safeText(input.description||p.description,160);if(input.category!==undefined)p.category=Validators.safeText(input.category||p.category,80);if(input.value!==undefined){if(n(p.installments)>1)throw new Error('Parcela de compra parcelada não deve ter valor editado isoladamente. Exclua a compra aberta e cadastre novamente.');p.value=Validators.positiveNumber(input.value,'Valor da compra');p.totalValue=p.value;}if(input.date!==undefined)p.date=input.date||p.date;if(input.invoiceMonth!==undefined)p.invoiceMonth=input.invoiceMonth||p.invoiceMonth;return p;}
  function deleteCardPurchase(data,id){ensure(data);const p=purchaseById(data,id);if(!p)throw new Error('Compra não encontrada.');if(p.billId)throw new Error('Compra já fechada em fatura não deve ser excluída diretamente.');const groupId=p.groupId||p.id;const group=data.cardPurchases.filter(x=>(x.groupId||x.id)===groupId&&!x.billId);data.cardPurchases=data.cardPurchases.filter(x=>(x.groupId||x.id)!==groupId||x.billId);return group;}
  function addMonthsToMonth(month,add){const [y,m]=String(month).split('-').map(Number);const d=new Date(y,m-1,1);d.setMonth(d.getMonth()+add);return d.toISOString().slice(0,7);}
  function invoiceMonthFor(card,date){const d=new Date((date||Models.today())+'T00:00:00');const closing=Number(card.closingDay||1);if(d.getDate()>closing)d.setMonth(d.getMonth()+1);return d.toISOString().slice(0,7);}
  function purchasesForInvoice(data,cardId,month){ensure(data);return data.cardPurchases.filter(p=>p.cardId===cardId&&p.invoiceMonth===month&&!p.billId);}
  function invoiceTotal(data,cardId,month){return r(purchasesForInvoice(data,cardId,month).reduce((s,p)=>s+n(p.value),0));}
  function cardOpenTotal(data,cardId){ensure(data);return r(data.cardPurchases.filter(p=>p.cardId===cardId&&!p.billId).reduce((s,p)=>s+n(p.value),0));}
  function cardAvailableLimit(data,cardId){const card=cardById(data,cardId);if(!card)return 0;return r(n(card.limit)-cardOpenTotal(data,cardId));}
  function closeCardInvoice(data,cardId,month,dueDate){ensure(data);const card=cardById(data,cardId);if(!card)throw new Error('Cartão não encontrado.');const purchases=purchasesForInvoice(data,cardId,month);if(!purchases.length)throw new Error('Não há compras abertas para esta fatura.');const total=invoiceTotal(data,cardId,month);const bill=FinanceEngine.addBill(data,{name:`Fatura ${card.name} ${month}`,flow:'A_PAGAR',expected:total,dueDate:dueDate||invoiceDueDate(card,month),category:'Cartão',walletId:card.walletId});purchases.forEach(p=>p.billId=bill.id);return {bill,purchases,total};}
  function invoiceDueDate(card,month){const day=Math.min(28,Math.max(1,parseInt(card.dueDay||10,10)));return `${month}-${String(day).padStart(2,'0')}`;}
  return {ensure,seedCategories,categoryById,budgetById,goalById,cardById,purchaseById,addCategory,updateCategory,deleteCategory,addBudget,updateBudget,deleteBudget,budgetSpent,copyBudgetsFromPreviousMonth,addGoal,updateGoal,contributeGoal,deleteGoal,addCard,updateCard,deleteCard,addCardPurchase,updateCardPurchase,deleteCardPurchase,purchasesForInvoice,invoiceTotal,cardOpenTotal,cardAvailableLimit,closeCardInvoice,invoiceMonthFor,invoiceDueDate,addMonthsToMonth};
})();
