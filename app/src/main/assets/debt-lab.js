// Módulo avançado de dívidas.
// Modela dívida como saldo vivo: principal + juros/multas - pagamentos/descontos.
// Integra com Transações, Contas a pagar e Previsão financeira.

(function(){
  function ensureDebtLabSeed(){
    if(!localStorage.vpDebtLabSeed){
      const old=db.get('debts',[]);
      const upgraded=old.map(function(d){
        return normalizeDebt(d);
      });
      if(!upgraded.length){
        upgraded.push({
          id:Date.now(),name:'Cartão atrasado',creditor:'Banco/Cartão',kind:'Cartão de crédito',original:850,balance:850,paid:0,interestRate:12.5,interestType:'Mensal composto',minPayment:120,due:'10/'+String(new Date().getMonth()+1).padStart(2,'0')+'/'+new Date().getFullYear(),status:'Aberta',priority:'Alta',notes:'Exemplo: dívida que cresce se não for paga.',history:[{date:today(),type:'criação',value:850,note:'Dívida criada'}]
        });
      }
      db.set('debts',upgraded);
      localStorage.vpDebtLabSeed='1';
    }
  }

  function normalizeDebt(d){
    const total=Number(d.total||d.original||0);
    const paid=Number(d.paid||0);
    const balance=Number(d.balance!=null?d.balance:Math.max(0,total-paid));
    return {
      id:d.id||Date.now()+Math.round(Math.random()*9999),
      name:d.name||'Dívida',
      creditor:d.creditor||'Não informado',
      kind:d.kind||'Empréstimo pessoal',
      original:Number(d.original||total||balance),
      balance:balance,
      paid:paid,
      interestRate:Number(d.interestRate||0),
      interestType:d.interestType||'Mensal simples',
      minPayment:Number(d.minPayment||0),
      due:d.due||'Sem data',
      status:d.status||'Aberta',
      priority:d.priority||'Média',
      notes:d.notes||'',
      history:d.history||[{date:today(),type:'migração',value:balance,note:'Dívida migrada'}]
    };
  }

  ensureDebtLabSeed();

  function debtsData(){ return db.get('debts',[]).map(normalizeDebt); }
  function saveDebts(a){ db.set('debts',a); }
  function openDebts(){ return debtsData().filter(d=>d.status!=='Quitada'); }
  function debtTotal(){ return openDebts().reduce((s,d)=>s+Number(d.balance||0),0); }
  function debtPaid(){ return debtsData().reduce((s,d)=>s+Number(d.paid||0),0); }
  function avgRate(){ const a=openDebts().filter(d=>d.interestRate>0); return a.length?a.reduce((s,d)=>s+d.interestRate,0)/a.length:0; }
  function risk(d){ if(d.status==='Quitada') return ['done','Quitada']; if(d.interestRate>=8||d.kind==='Cartão de crédito'||d.kind==='Cheque especial') return ['high','Alto risco']; if(d.interestRate>=3) return ['medium','Médio risco']; return ['low','Baixo risco']; }

  window.debtRest=function(){ return debtTotal(); };

  window.debts=function(){
    vpCurrentScreen='debts';
    head('Dívidas','Saldo vivo, juros, negociação, parcelas e integração financeira.');
    const total=debtTotal(), paid=debtPaid(), rate=avgRate();
    const a=debtsData();
    app.innerHTML=`<div class="debt-hero"><div class="mf-topline"><div class="mf-brand">Central de Dívidas</div><button class="mf-private-toggle" data-view="debtStrategy">Estratégia</button></div><h2>${money(total)}</h2><p>Saldo devedor atual. Dívidas podem reduzir com pagamentos/descontos ou aumentar com juros, multas e encargos.</p><div class="debt-grid"><div class="debt-mini"><span>Total pago</span><strong>${money(paid)}</strong></div><div class="debt-mini"><span>Juros médio</span><strong>${rate.toFixed(2).replace('.',',')}% a.m.</strong></div><div class="debt-mini"><span>Em aberto</span><strong>${openDebts().length}</strong></div><div class="debt-mini"><span>Quitadas</span><strong>${a.filter(d=>d.status==='Quitada').length}</strong></div></div></div>
    <div class="debt-tabs"><button class="on" data-view="debtOverview">Resumo</button><button data-view="debtStrategy">Estratégias</button><button data-view="debtSimulator">Simulador</button><button data-view="debtTimeline">Histórico</button></div>
    <div class="debt-tools"><button class="debt-tool" data-act="debtAdvanced"><b>＋</b><span>Nova dívida</span></button><button class="debt-tool" data-view="accounts"><b>🧾</b><span>Contas ligadas</span></button></div>
    <div id="debtContent">${debtOverviewHtml()}</div>`;
  };

  function debtOverviewHtml(){
    const a=debtsData();
    return debtAlerts()+debtPriorityHtml()+debtListHtml(a);
  }

  function debtAlerts(){
    const high=openDebts().filter(d=>risk(d)[0]==='high');
    const min=openDebts().reduce((s,d)=>s+Number(d.minPayment||0),0);
    return `<div class="debt-warning"><strong>Diagnóstico</strong>${high.length?`Você tem ${high.length} dívida(s) de alto risco. Priorize juros maiores e evite pagar só mínimo se houver encargos altos.`:'Nenhuma dívida de alto risco identificada.'}<br>Pagamento mínimo mensal estimado: <b>${money(min)}</b>.</div>`;
  }

  function debtPriorityHtml(){
    const avalanche=openDebts().slice().sort((a,b)=>b.interestRate-a.interestRate);
    const snowball=openDebts().slice().sort((a,b)=>a.balance-b.balance);
    return `<div class="debt-card"><h3>Ordem sugerida</h3><p><b>Avalanche:</b> prioriza maior juros, geralmente reduz custo total. <br><b>Bola de neve:</b> prioriza menor saldo, melhora motivação.</p><div class="strategy-box"><div class="strategy"><h4>Avalanche</h4><ol>${avalanche.slice(0,4).map(d=>`<li>${esc(d.name)} — ${d.interestRate}% a.m. — ${money(d.balance)}</li>`).join('')||'<li>Sem dívidas abertas.</li>'}</ol></div><div class="strategy"><h4>Bola de neve</h4><ol>${snowball.slice(0,4).map(d=>`<li>${esc(d.name)} — ${money(d.balance)}</li>`).join('')||'<li>Sem dívidas abertas.</li>'}</ol></div></div></div>`;
  }

  function debtListHtml(a){
    if(!a.length) return empty('Nenhuma dívida cadastrada.');
    return a.map((d,i)=>debtItem(d,i)).join('');
  }

  function debtItem(d,i){
    const r=risk(d), pct=d.original?Math.max(0,Math.min(100,Math.round((d.paid/d.original)*100))):0;
    return `<div class="debt-card"><div class="debt-row"><div class="debt-icon">${d.status==='Quitada'?'✓':'!'}</div><div><h4>${esc(d.name)}</h4><small>${esc(d.creditor)} • ${esc(d.kind)} • vence ${esc(d.due)}</small><span class="risk ${r[0]}">${r[1]}</span><span class="installment-chip">${d.interestRate}% a.m.</span></div><strong>${money(d.balance)}</strong></div><div class="debt-progress"><span style="width:${pct}%"></span></div><div class="actions"><button class="mini primary" data-debt-pay="${i}">Pagar</button><button class="mini" data-debt-discount="${i}">Desconto</button><button class="mini" data-debt-charge="${i}">Juros/Multa</button><button class="mini" data-debt-negotiate="${i}">Negociar</button><button class="mini danger" data-debt-delete="${i}">Excluir</button></div></div>`;
  }

  function debtStrategy(){
    vpCurrentScreen='debtStrategy';
    head('Estratégias de pagamento','Avalanche, bola de neve, negociação e redução de custo.');
    app.innerHTML=`<div class="debt-tabs"><button data-go="debts">Resumo</button><button class="on">Estratégias</button></div>${debtPriorityHtml()}<div class="debt-card"><h3>Como dívidas mudam</h3><p><b>Reduzem</b> com pagamento, desconto, abatimento, portabilidade, renegociação com taxa menor ou quitação antecipada.<br><br><b>Aumentam</b> com juros, multa, mora, IOF, encargos, novas compras, parcelamentos ruins ou pagamento mínimo do cartão.</p></div><div class="debt-card"><h3>Checklist antes de negociar</h3><p>1. Descubra saldo atualizado.<br>2. Peça desconto à vista e opção parcelada.<br>3. Compare custo total, não só parcela.<br>4. Não aceite parcela que estrangule contas básicas.<br>5. Registre o acordo como contas a pagar futuras.</p></div>`;
  }

  function debtSimulator(){
    vpCurrentScreen='debtSimulator';
    head('Simulador de dívidas','Compare pagamento mensal, juros e prazo estimado.');
    const total=debtTotal();
    app.innerHTML=`<div class="debt-card"><h3>Simular pagamento</h3><label class="field"><span>Saldo devedor</span><input id="simDebt" value="${String(total.toFixed(2)).replace('.',',')}"></label><label class="field"><span>Juros mensal (%)</span><input id="simRate" value="${avgRate().toFixed(2).replace('.',',')}"></label><label class="field"><span>Pagamento mensal</span><input id="simPay" value="300"></label><button class="btn amber" data-act="runDebtSim">Calcular</button></div><div id="simResult"></div>`;
  }

  function runDebtSim(){
    let balance=parseMoney(val('simDebt')), rate=parseMoney(val('simRate'))/100, pay=parseMoney(val('simPay'));
    let months=0, interest=0;
    if(pay<=balance*rate){document.getElementById('simResult').innerHTML=card('Atenção','O pagamento mensal informado não cobre os juros estimados. A dívida pode crescer.','red');return;}
    while(balance>0&&months<600){let juros=balance*rate;interest+=juros;balance+=juros;balance-=pay;months++;}
    document.getElementById('simResult').innerHTML=`<div class="debt-impact"><div class="debt-card"><h3>Prazo</h3><p>${months} meses</p></div><div class="debt-card"><h3>Juros estimados</h3><p>${money(interest)}</p></div></div>`;
  }

  function debtTimeline(){
    vpCurrentScreen='debtTimeline';
    head('Histórico das dívidas','Eventos de criação, pagamento, desconto, juros e negociação.');
    const logs=[];
    debtsData().forEach(d=>(d.history||[]).forEach(h=>logs.push({...h,debt:d.name})));
    logs.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    app.innerHTML=`<div class="timeline-log">${logs.length?logs.map(l=>`<div class="log-item"><b>${esc(l.debt)} — ${esc(l.type)}</b><small>${esc(l.date)} • ${money(l.value)} • ${esc(l.note||'')}</small></div>`).join(''):empty('Sem histórico.')}</div>`;
  }

  function debtAdvancedForm(){
    form('Nova dívida',[{id:'dName',label:'Nome'},{id:'dCreditor',label:'Credor'},{id:'dKind',label:'Tipo',options:['Cartão de crédito','Cheque especial','Empréstimo pessoal','Financiamento','Boleto atrasado','Acordo parcelado','Outro']},{id:'dOriginal',label:'Valor original'},{id:'dBalance',label:'Saldo atual'},{id:'dRate',label:'Juros mensal (%)',value:'0'},{id:'dMin',label:'Pagamento mínimo mensal',value:'0'},{id:'dDue',label:'Vencimento',value:today()},{id:'dPriority',label:'Prioridade',options:['Alta','Média','Baixa']},{id:'dNotes',label:'Observações'}],'saveDebtAdvanced');
  }

  function saveDebtAdvanced(){
    const original=parseMoney(val('dOriginal')), balance=parseMoney(val('dBalance'))||original;
    const a=debtsData();
    a.push({id:Date.now(),name:val('dName')||'Dívida',creditor:val('dCreditor')||'Não informado',kind:val('dKind')||'Outro',original:original,balance:balance,paid:0,interestRate:parseMoney(val('dRate')),interestType:'Mensal composto',minPayment:parseMoney(val('dMin')),due:val('dDue')||today(),status:'Aberta',priority:val('dPriority')||'Média',notes:val('dNotes')||'',history:[{date:today(),type:'criação',value:balance,note:'Dívida cadastrada'}]});
    saveDebts(a);closeSheet();debts();
  }

  function payDebtAdvanced(i){
    const d=debtsData()[i]; if(!d)return;
    openSheet(`<h2>Pagar dívida</h2><p class="meta">${esc(d.name)} — saldo ${money(d.balance)}</p><label class="field"><span>Valor pago</span><input id="dpValue"></label><label class="field"><span>Data</span><input id="dpDate" value="${today()}"></label><label class="field"><span>Observação</span><input id="dpNote" value="Pagamento da dívida"></label><div class="row"><button class="btn alt" data-act="close">Cancelar</button><button class="btn" data-save-debt-pay="${i}">Salvar</button></div>`);
  }

  function saveDebtPay(i){
    const a=debtsData(), d=a[i]; if(!d)return;
    const value=parseMoney(val('dpValue')); if(value<=0)return;
    d.paid=Number(d.paid||0)+value; d.balance=Math.max(0,Number(d.balance||0)-value); if(d.balance<=0)d.status='Quitada';
    d.history.push({date:val('dpDate')||today(),type:'pagamento',value:value,note:val('dpNote')||'Pagamento'});
    a[i]=d; saveDebts(a);
    const tx=db.get('tx',[]); tx.push({type:'despesa',value:value,desc:'Pagamento de dívida: '+d.name,cat:'Dívidas',wallet:'Principal',date:val('dpDate')||today()}); db.set('tx',tx);
    closeSheet();debts();
  }

  function discountDebt(i){
    const d=debtsData()[i]; if(!d)return;
    openSheet(`<h2>Registrar desconto/abatimento</h2><p class="meta">Reduz a dívida sem gerar despesa.</p><label class="field"><span>Valor reduzido</span><input id="ddValue"></label><label class="field"><span>Motivo</span><input id="ddNote" value="Desconto negociado"></label><div class="row"><button class="btn alt" data-act="close">Cancelar</button><button class="btn" data-save-debt-discount="${i}">Salvar</button></div>`);
  }

  function saveDebtDiscount(i){
    const a=debtsData(), d=a[i]; if(!d)return;
    const value=parseMoney(val('ddValue')); if(value<=0)return;
    d.balance=Math.max(0,Number(d.balance||0)-value); if(d.balance<=0)d.status='Quitada';
    d.history.push({date:today(),type:'desconto',value:value,note:val('ddNote')||'Desconto'});
    a[i]=d; saveDebts(a); closeSheet();debts();
  }

  function chargeDebt(i){
    const d=debtsData()[i]; if(!d)return;
    openSheet(`<h2>Adicionar juros/multa</h2><p class="meta">Aumenta o saldo vivo da dívida.</p><label class="field"><span>Valor do acréscimo</span><input id="dcValue"></label><label class="field"><span>Motivo</span><input id="dcNote" value="Juros/multa/encargos"></label><div class="row"><button class="btn alt" data-act="close">Cancelar</button><button class="btn" data-save-debt-charge="${i}">Salvar</button></div>`);
  }

  function saveDebtCharge(i){
    const a=debtsData(), d=a[i]; if(!d)return;
    const value=parseMoney(val('dcValue')); if(value<=0)return;
    d.balance=Number(d.balance||0)+value; d.original=Number(d.original||0)+value; d.status='Aberta';
    d.history.push({date:today(),type:'acréscimo',value:value,note:val('dcNote')||'Encargos'});
    a[i]=d; saveDebts(a); closeSheet();debts();
  }

  function negotiateDebt(i){
    const d=debtsData()[i]; if(!d)return;
    openSheet(`<h2>Negociar dívida</h2><p class="meta">Gera novo saldo e, opcionalmente, parcelas como contas a pagar.</p><label class="field"><span>Novo saldo acordado</span><input id="dnBalance" value="${String(d.balance).replace('.',',')}"></label><label class="field"><span>Quantidade de parcelas</span><input id="dnInstallments" value="1"></label><label class="field"><span>Primeiro vencimento</span><input id="dnDue" value="${today()}"></label><label class="field"><span>Observação</span><input id="dnNote" value="Renegociação"></label><div class="row"><button class="btn alt" data-act="close">Cancelar</button><button class="btn" data-save-debt-negotiate="${i}">Salvar</button></div>`);
  }

  function saveDebtNegotiate(i){
    const a=debtsData(), d=a[i]; if(!d)return;
    const old=Number(d.balance||0), newBal=parseMoney(val('dnBalance')), n=Math.max(1,parseInt(val('dnInstallments')||'1',10));
    d.balance=newBal; d.status='Renegociada';
    d.history.push({date:today(),type:'renegociação',value:newBal,note:`Saldo anterior ${money(old)}. ${val('dnNote')||''}`});
    a[i]=d; saveDebts(a);
    const bills=db.get('bills',[]), installment=newBal/n;
    for(let p=1;p<=n;p++) bills.push({name:`Parcela ${p}/${n} - ${d.name}`,flow:'A_PAGAR',expected:installment,final:0,due:p===1?val('dnDue'):'Próximo ciclo',cat:'Dívidas',wallet:'Principal',status:'PENDENTE',repeat:'Nenhuma',notes:'Gerada por renegociação de dívida'});
    db.set('bills',bills); closeSheet();debts();
  }

  function deleteDebt(i){
    const a=debtsData(); a.splice(i,1); saveDebts(a); debts();
  }

  const oldFinDebtIntegration=window.fin;
  window.fin=function(){
    oldFinDebtIntegration();
    const total=debtTotal();
    const high=openDebts().filter(d=>risk(d)[0]==='high').length;
    const box=`<div class="mf-section"><div class="debt-card"><h3>Dívidas integradas</h3><p>Saldo vivo: <b>${money(total)}</b><br>Alto risco: <b>${high}</b><br>Pagamentos de dívidas entram como despesas; renegociações geram contas a pagar futuras.</p><div class="actions"><button class="mini primary" data-go="debts">Abrir dívidas</button><button class="mini" data-view="forecast">Ver previsão</button></div></div></div>`;
    const page=document.querySelector('.mf-page'); if(page) page.insertAdjacentHTML('beforeend',box);
  };

  const oldForecastDebtIntegration=window.forecast;
  window.forecast=function(){
    vpCurrentScreen='forecast';
    head('Previsão','Saldo futuro considerando contas, recorrências, dívidas e acordos.');
    let current=sum('receita')-sum('despesa');
    let recurring=db.get('subs',[]).filter(s=>s.status!=='Pausada').reduce((a,s)=>a+Number(s.value||0),0);
    let bills=db.get('bills',[]);
    let payable=bills.filter(b=>b.flow==='A_PAGAR'&&b.status==='PENDENTE').reduce((s,b)=>s+Number(b.expected||0),0);
    let receivable=bills.filter(b=>b.flow==='A_RECEBER'&&b.status==='PENDENTE').reduce((s,b)=>s+Number(b.expected||0),0);
    let minimum=openDebts().reduce((s,d)=>s+Number(d.minPayment||0),0);
    let projected=current+receivable-payable-recurring-minimum;
    app.innerHTML=`<div class="grid">${metric('Saldo atual',money(current),current>=0?'green':'red')}${metric('A receber',money(receivable),'green')}${metric('A pagar',money(payable+recurring),'red')}${metric('Mín. dívidas',money(minimum),'amber')}</div>`+card('Previsão pós-dívidas',`Saldo projetado considerando pagamentos mínimos: <b>${money(projected)}</b>.`,projected>=0?'green':'amber');
  };

  views.debtOverview=function(){debts();};
  views.debtStrategy=debtStrategy;
  views.debtSimulator=debtSimulator;
  views.debtTimeline=debtTimeline;
  acts.debtAdvanced=debtAdvancedForm;
  acts.saveDebtAdvanced=saveDebtAdvanced;
  acts.runDebtSim=runDebtSim;

  const oldContextDebt=window.contextAdd;
  window.contextAdd=function(){
    if(vpCurrentScreen==='debts') return debtAdvancedForm();
    if(vpCurrentScreen==='debtStrategy') return debtAdvancedForm();
    if(vpCurrentScreen==='debtSimulator') return debtSimulator();
    return oldContextDebt ? oldContextDebt() : quickAdd();
  };

  document.body.addEventListener('click',function(e){
    const pay=e.target.closest('[data-debt-pay]'); if(pay){payDebtAdvanced(Number(pay.dataset.debtPay));return;}
    const dis=e.target.closest('[data-debt-discount]'); if(dis){discountDebt(Number(dis.dataset.debtDiscount));return;}
    const ch=e.target.closest('[data-debt-charge]'); if(ch){chargeDebt(Number(ch.dataset.debtCharge));return;}
    const neg=e.target.closest('[data-debt-negotiate]'); if(neg){negotiateDebt(Number(neg.dataset.debtNegotiate));return;}
    const del=e.target.closest('[data-debt-delete]'); if(del){deleteDebt(Number(del.dataset.debtDelete));return;}
    const sp=e.target.closest('[data-save-debt-pay]'); if(sp){saveDebtPay(Number(sp.dataset.saveDebtPay));return;}
    const sd=e.target.closest('[data-save-debt-discount]'); if(sd){saveDebtDiscount(Number(sd.dataset.saveDebtDiscount));return;}
    const sc=e.target.closest('[data-save-debt-charge]'); if(sc){saveDebtCharge(Number(sc.dataset.saveDebtCharge));return;}
    const sn=e.target.closest('[data-save-debt-negotiate]'); if(sn){saveDebtNegotiate(Number(sn.dataset.saveDebtNegotiate));return;}
  });

  renderNav();
  if(route==='debts') debts();
})();
