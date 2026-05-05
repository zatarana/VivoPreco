window.UXRefinements=(function(){
  function walletName(data,id){return ((data.wallets||[]).find(w=>w.id===id)||{}).name||'Conta financeira';}
  function txItem(data,t){
    const locked=t.billId||t.debtId;
    const actions=!locked?`<div class="actions compact-actions">${Components.mini('Editar','editTransaction',t.id)}${Components.mini('Excluir','deleteTransaction',t.id,'danger')}</div>`:`<div class="meta">Vinculada a conta pendente/dívida</div>`;
    if(t.type==='transferencia')return `<div class="item compact-item"><h4>${Dom.esc(t.description||'Transferência')}</h4><div class="meta">${walletName(data,t.fromWalletId)} → ${walletName(data,t.toWalletId)} • ${Dom.date(t.date)} • ${Dom.money(t.value)}</div>${actions}</div>`;
    return `<div class="item compact-item ${t.type==='receita'?'success-accent':'danger-accent'}"><h4>${Dom.esc(t.description||'Transação')}</h4><div class="meta">${Dom.esc(t.category||'Geral')} • ${walletName(data,t.walletId)} • ${Dom.date(t.date)} • ${Dom.money(t.value)}</div>${actions}</div>`;
  }
  function billRemaining(b){return FinanceEngine.billRemaining(b);}
  function debtName(data,id){return ((data.debts||[]).find(d=>d.id===id)||{}).name||'Dívida';}
  function groupedDebtBills(data){
    const groups={};
    (data.bills||[]).filter(b=>b.debtId&&billRemaining(b)>0).forEach(b=>{groups[b.debtId]=groups[b.debtId]||[];groups[b.debtId].push(b);});
    return Object.keys(groups).map(id=>{const list=groups[id].sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate)));const total=list.reduce((s,b)=>s+billRemaining(b),0);return {debtId:id,bills:list,total,next:list[0]};}).sort((a,b)=>String(a.next&&a.next.dueDate).localeCompare(String(b.next&&b.next.dueDate)));
  }
  function showPlanningHub(data){
    PlanningEngine.ensure(data);
    Dom.setHeader('Planejamento','Categorias, orçamentos e metas.');
    Dom.render(`<div class="grid compact-grid">${Components.metric('Categorias',String((data.categories||[]).length),'primary')}${Components.metric('Orçamentos',String((data.budgets||[]).length),'warning')}${Components.metric('Metas',String((data.goals||[]).length),'success')}</div><div class="quick-actions">${Components.button('Categorias','showCategories')}${Components.button('Orçamentos','showBudgets','secondary')}${Components.button('Metas','showGoals','secondary')}</div>${Components.card('Cartões ficam em Finanças','Como cartão afeta fatura, limite e contas a pagar, ele foi colocado dentro da área Finanças.')}`);
  }
  function showFinance(data){
    const tx=(data.transactions||[]).slice().reverse().slice(0,8);
    Dom.setHeader('Finanças','Transações, contas financeiras, contas pendentes, cartões e visão mensal.');
    Dom.render(`<section class="finance-hero compact-hero"><small>Saldo disponível nas contas financeiras</small><h2>${Dom.money(FinanceEngine.totalWalletBalance(data))}</h2><div class="grid compact-grid">${Components.metric('Receitas',Dom.money(FinanceEngine.income(data)),'success')}${Components.metric('Despesas',Dom.money(FinanceEngine.expense(data)),'danger')}${Components.metric('A receber',Dom.money(FinanceEngine.receivable(data)),'success')}${Components.metric('A pagar',Dom.money(FinanceEngine.payable(data)),'danger')}</div></section><div class="quick-actions">${Components.button('+ Transação','newTransaction')}${Components.button('Transferir','newTransfer','secondary')}${Components.button('+ Conta pendente','newBill','secondary')}${Components.button('Contas financeiras','showWallets','secondary')}</div><div class="quick-actions">${Components.button('Mensal','monthlyFinance','primary')}${Components.button('Contas pendentes','showBills','secondary')}${Components.button('Cartões','showCards','secondary')}${Components.button('Relatório','showFinanceReport','secondary')}</div><h2 class="section">Últimas transações</h2><div class="list compact-list">${tx.length?tx.map(t=>txItem(data,t)).join(''):Components.empty('Nenhuma transação.')}</div><h2 class="section">Próximas pendências</h2>${compactBills(data)}`);
  }
  function compactBills(data){
    const regular=(data.bills||[]).filter(b=>!b.debtId&&billRemaining(b)>0).sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate))).slice(0,3);
    const debts=groupedDebtBills(data).slice(0,2);
    const parts=[];
    regular.forEach(b=>parts.push(`<div class="item compact-item"><h4>${Dom.esc(b.name)}</h4><div class="meta">${b.flow==='A_PAGAR'?'A pagar':'A receber'} • ${Dom.money(billRemaining(b))} • ${Dom.date(b.dueDate)} • ${walletName(data,b.walletId)}</div><div class="actions compact-actions">${Components.mini('Liquidar','settleBillForm',b.id,'primary')}${Components.mini('Editar','editBill',b.id)}</div></div>`));
    debts.forEach(g=>parts.push(`<div class="item compact-item debt-accent"><h4>${Dom.esc(debtName(data,g.debtId))}</h4><div class="meta">${g.bills.length} parcela(s) aberta(s) • Total ${Dom.money(g.total)} • Próxima ${Dom.money(billRemaining(g.next))} em ${Dom.date(g.next.dueDate)}</div><div class="actions compact-actions">${Components.mini('Ver dívida','openDebt',g.debtId,'primary')}${Components.mini('Liquidar próxima','settleBillForm',g.next.id)}</div></div>`));
    return parts.length?parts.join(''):Components.empty('Nenhuma conta pendente.');
  }
  function showBillsGrouped(data){
    Dom.setHeader('Contas pendentes','Pendências agrupadas para reduzir poluição visual.');
    const regular=(data.bills||[]).filter(b=>!b.debtId).sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate)));
    const debtGroups=groupedDebtBills(data);
    const paid=(data.bills||[]).filter(b=>FinanceEngine.billRemaining(b)<=0).length;
    const regularHtml=regular.length?regular.map(b=>`<div class="item compact-item ${billRemaining(b)>0?'':'success-accent'}"><h4>${Dom.esc(b.name)}</h4><div class="meta">${b.flow==='A_PAGAR'?'A pagar':'A receber'} • Previsto ${Dom.money(b.expected)} • Liquidado ${Dom.money(FinanceEngine.billSettled(b))} • Pendente ${Dom.money(billRemaining(b))} • ${Dom.esc(b.status)} • ${walletName(data,b.walletId)}</div><div class="actions compact-actions">${billRemaining(b)>0?Components.mini('Liquidar','settleBillForm',b.id,'primary'):''}${Components.mini('Editar','editBill',b.id)}${FinanceEngine.billSettled(b)<=0?Components.mini('Excluir','deleteBill',b.id,'danger'):''}</div></div>`).join(''):Components.empty('Nenhuma conta pendente comum.');
    const debtHtml=debtGroups.length?debtGroups.map(g=>`<div class="item compact-item debt-accent"><h4>${Dom.esc(debtName(data,g.debtId))}</h4><div class="meta">${g.bills.length} parcela(s) aberta(s) • Total pendente ${Dom.money(g.total)} • Próxima ${Dom.money(billRemaining(g.next))} em ${Dom.date(g.next.dueDate)}</div><div class="actions compact-actions">${Components.mini('Ver dívida','openDebt',g.debtId,'primary')}${Components.mini('Liquidar próxima','settleBillForm',g.next.id)}${Components.mini('Parcelas','showDebtInstallments',g.debtId)}</div></div>`).join(''):Components.empty('Nenhuma parcela de dívida aberta.');
    Dom.render(`${Components.button('+ Nova conta pendente','newBill')}<div class="grid compact-grid">${Components.metric('A pagar',Dom.money(FinanceEngine.payable(data)),'danger')}${Components.metric('A receber',Dom.money(FinanceEngine.receivable(data)),'success')}${Components.metric('Parcelas agrupadas',String(debtGroups.length),'primary')}${Components.metric('Pagas/recebidas',String(paid),'success')}</div><h2 class="section">Contas comuns</h2>${regularHtml}<h2 class="section">Parcelas de dívidas</h2>${debtHtml}`);
  }
  function showDebtInstallments(debtId){
    const data=StorageService.read();
    const list=(data.bills||[]).filter(b=>b.debtId===debtId).sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate)));
    Dom.setHeader('Parcelas da dívida',debtName(data,debtId));
    Dom.render(`${Components.button('Voltar para dívida','openDebt','secondary').replace('data-action="openDebt"','data-action="openDebt" data-id="'+debtId+'"')}<div class="list compact-list">${list.length?list.map(b=>`<div class="item compact-item ${billRemaining(b)>0?'':'success-accent'}"><h4>${Dom.esc(b.name)}</h4><div class="meta">Vence ${Dom.date(b.dueDate)} • Previsto ${Dom.money(b.expected)} • Liquidado ${Dom.money(FinanceEngine.billSettled(b))} • Pendente ${Dom.money(billRemaining(b))} • ${Dom.esc(b.status)}</div><div class="actions compact-actions">${billRemaining(b)>0?Components.mini('Liquidar','settleBillForm',b.id,'primary'):''}</div></div>`).join(''):Components.empty('Nenhuma parcela encontrada.')}</div>`);
  }
  function showFinanceReportClean(data){
    const cats={};
    (data.transactions||[]).filter(t=>t.type==='despesa').forEach(t=>cats[t.category||'Geral']=(cats[t.category||'Geral']||0)+Number(t.value||0));
    Dom.setHeader('Relatório financeiro','Resumo baseado apenas em transações reais e contas pendentes.');
    Dom.render(`<div class="grid compact-grid">${Components.metric('Receitas reais',Dom.money(FinanceEngine.income(data)),'success')}${Components.metric('Despesas reais',Dom.money(FinanceEngine.expense(data)),'danger')}${Components.metric('Saldo disponível',Dom.money(FinanceEngine.totalWalletBalance(data)),FinanceEngine.totalWalletBalance(data)>=0?'success':'danger')}${Components.metric('Pendências',Dom.money(FinanceEngine.payable(data)-FinanceEngine.receivable(data)),'warning')}</div>${Components.card('Despesas por categoria',Object.keys(cats).sort((a,b)=>cats[b]-cats[a]).map(k=>`${Dom.esc(k)}: <b>${Dom.money(cats[k])}</b>`).join('<br>')||'Sem despesas registradas.')} ${Components.card('Observação','Saldo disponível é dinheiro real nas contas financeiras. Pendências não alteram saldo até serem liquidadas.')}`);
  }
  function install(){
    if(window.PlanningUI){PlanningUI.showHub=showPlanningHub;}
    if(window.FinanceUI){FinanceUI.render=showFinance;FinanceUI.showBills=showBillsGrouped;FinanceUI.showFinanceReport=showFinanceReportClean;}
    window.UXRefinements.showDebtInstallments=showDebtInstallments;
  }
  setTimeout(install,0);
  return {install,showDebtInstallments};
})();
