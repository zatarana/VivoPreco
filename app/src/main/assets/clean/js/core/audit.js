window.AuditService=(function(){
  function run(data){
    const issues=[];
    const wallets=new Set((data.wallets||[]).map(w=>w.id));
    const bills=new Map((data.bills||[]).map(b=>[b.id,b]));
    const debts=new Map((data.debts||[]).map(d=>[d.id,d]));
    const projects=new Set((data.projects||[]).map(p=>p.id));

    if(!data.preferences||!data.preferences.defaultWalletId)issues.push(warn('Nenhuma carteira padrão definida.'));
    if(data.preferences&&data.preferences.defaultWalletId&&!wallets.has(data.preferences.defaultWalletId))issues.push(error('Carteira padrão aponta para uma carteira inexistente.'));

    (data.wallets||[]).forEach(w=>{
      if(!w.id)issues.push(error('Carteira sem ID.'));
      if(!w.name)issues.push(error('Carteira sem nome.'));
      if(!Number.isFinite(Number(w.initialBalance||0)))issues.push(error(`Carteira ${w.name||w.id} tem saldo inicial inválido.`));
    });

    (data.transactions||[]).forEach(t=>{
      if(!['receita','despesa','transferencia'].includes(t.type))issues.push(error(`Transação ${t.id} tem tipo inválido.`));
      if(Number(t.value||0)<=0)issues.push(error(`Transação ${t.id} tem valor inválido.`));
      if(t.type==='transferencia'){
        if(!wallets.has(t.fromWalletId))issues.push(warn(`Transferência ${t.id} tem origem inexistente.`));
        if(!wallets.has(t.toWalletId))issues.push(warn(`Transferência ${t.id} tem destino inexistente.`));
        if(t.fromWalletId===t.toWalletId)issues.push(error(`Transferência ${t.id} usa a mesma carteira na origem e destino.`));
      }else if(!wallets.has(t.walletId))issues.push(warn(`Transação ${t.id} aponta para carteira inexistente.`));
      if(t.billId&&!bills.has(t.billId))issues.push(warn(`Transação ${t.id} aponta para conta inexistente.`));
      if(t.debtId&&!debts.has(t.debtId))issues.push(warn(`Transação ${t.id} aponta para dívida inexistente.`));
    });

    (data.bills||[]).forEach(b=>{
      if(!['A_PAGAR','A_RECEBER'].includes(b.flow))issues.push(error(`Conta ${b.id} tem fluxo inválido.`));
      if(Number(b.expected||0)<=0)issues.push(error(`Conta ${b.name||b.id} tem valor previsto inválido.`));
      if(FinanceEngine.billRemaining(b)<0)issues.push(error(`Conta ${b.name||b.id} tem pendente negativo.`));
      if(!wallets.has(b.walletId))issues.push(warn(`Conta ${b.name||b.id} aponta para carteira inexistente.`));
      if(b.debtId&&!debts.has(b.debtId))issues.push(warn(`Conta ${b.name||b.id} aponta para dívida inexistente.`));
    });

    (data.debts||[]).forEach(d=>{
      if(Number(d.balance||0)<0)issues.push(error(`Dívida ${d.name||d.id} tem saldo negativo.`));
      if(Number(d.paid||0)<0)issues.push(error(`Dívida ${d.name||d.id} tem pago negativo.`));
      if(!Array.isArray(d.events))issues.push(warn(`Dívida ${d.name||d.id} não tem histórico de eventos.`));
    });

    (data.tasks||[]).forEach(t=>{
      if(!t.title)issues.push(error(`Tarefa ${t.id} sem título.`));
      if(!projects.has(t.projectId))issues.push(warn(`Tarefa ${t.title||t.id} aponta para projeto inexistente.`));
      if(!['P1','P2','P3','P4'].includes(t.priority))issues.push(warn(`Tarefa ${t.title||t.id} tem prioridade inválida.`));
    });

    return {ok:issues.filter(i=>i.level==='erro').length===0,issues};
  }
  function error(message){return {level:'erro',message};}
  function warn(message){return {level:'aviso',message};}
  return {run};
})();
