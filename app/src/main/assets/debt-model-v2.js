// Modelo v2 de Dívidas: separa obrigação, conta futura e transação realizada.
// Regra central: cadastrar dívida NÃO cria transação. Só pagamento real cria transação.

(function(){
  const DEBT_STATUS=['Em aberto','Em atraso','Em negociação','Renegociada','Em pagamento','Quitada','Contestada'];
  const DEBT_MODES=['Saldo informado','Juros conhecidos','Manual avançado'];

  function nowId(){ return Date.now()+Math.round(Math.random()*9999); }
  function debtsRaw(){ return db.get('debts',[]).map(normalizeDebtV2); }
  function saveDebtsV2(a){ db.set('debts',a.map(normalizeDebtV2)); }
  function openDebtList(){ return debtsRaw().filter(d=>d.status!=='Quitada'); }

  function normalizeDebtV2(d){
    const original=Number(d.original||d.total||d.balance||0);
    const paid=Number(d.paid||0);
    const balance=Number(d.balance!=null?d.balance:Math.max(0,original-paid));
    const history=Array.isArray(d.history)?d.history:[];
    return {
      id:d.id||nowId(),
      name:d.name||'Dívida',
      creditor:d.creditor||'Não informado',
      kind:d.kind||'Outro',
      original:original,
      balance:balance,
      paid:paid,
      interestKnown:!!d.interestKnown,
      interestRate:d.interestKnown?Number(d.interestRate||0):null,
      interestType:d.interestType||'Não informado',
      mode:d.mode||((d.interestRate&&Number(d.interestRate)>0)?'Juros conhecidos':'Saldo informado'),
      minPayment:Number(d.minPayment||0),
      due:d.due||'Sem data',
      status:d.status||'Em aberto',
      priority:d.priority||'Média',
      notes:d.notes||'',
      linkedBills:Array.isArray(d.linkedBills)?d.linkedBills:[],
      installments:Array.isArray(d.installments)?d.installments:[],
      history:history.length?history:[eventObj('Cadastro',balance,'Dívida registrada. Não houve movimentação financeira.','neutral')]
    };
  }

  function eventObj(type,value,note,effect,extra){
    return Object.assign({id:nowId(),date:today(),type:type,value:Number(value||0),note:note||'',effect:effect||'neutral'},extra||{});
  }

  function totalDebtV2(){ return openDebtList().reduce((s,d)=>s+Number(d.balance||0),0); }
  function paidDebtV2(){ return debtsRaw().reduce((s,d)=>s+Number(d.paid||0),0); }
  function futureDebtBills(){ return db.get('bills',[]).filter(b=>b.status==='PENDENTE'&&String(b.notes||'').includes('vinculada à dívida')); }
  function knownRateCount(){ return openDebtList().filter(d=>d.interestKnown&&Number(d.interestRate)>0).length; }
  function avgKnownRate(){ const a=openDebtList().filter(d=>d.interestKnown&&Number(d.interestRate)>0); return a.length?a.reduce((s,d)=>s+Number(d.interestRate||0),0)/a.length:0; }

  function debtRisk(d){
    if(d.status==='Quitada') return ['done','Quitada'];
    if(d.status==='Contestada') return ['medium','Contestada'];
    if(d.status==='Em atraso') return ['high','Em atraso'];
    if(d.interestKnown&&d.interestRate>=8) return ['high','Juros altos'];
    if(d.kind==='Cartão de crédito'||d.kind==='Cheque especial') return ['high','Alto risco'];
    if(d.interestKnown&&d.interestRate>=3) return ['medium','Atenção'];
    return ['low','Controlada'];
  }

  window.debtRest=function(){ return totalDebtV2(); };

  window.debts=function(){
    vpCurrentScreen='debts';
    head('Dívidas','Controle passivo: cadastro não gera despesa; pagamentos reais geram transações.');
    const debts=debtsRaw();
    const total=totalDebtV2();
    const paid=paidDebtV2();
    const future=futureDebtBills().reduce((s,b)=>s+Number(b.expected||0),0);
    app.innerHTML=`<div class="debt-hero"><div class="mf-topline"><div class="mf-brand">Dívidas v2</div><button class="mf-private-toggle" data-v2-view="debtRules">Regras</button></div><h2>${money(total)}</h2><p>Saldo vivo das obrigações. Só vira despesa quando houver pagamento real.</p><div class="debt-grid"><div class="debt-mini"><span>Total pago</span><strong>${money(paid)}</strong></div><div class="debt-mini"><span>Parcelas futuras</span><strong>${money(future)}</strong></div><div class="debt-mini"><span>Juros conhecidos</span><strong>${knownRateCount()}</strong></div><div class="debt-mini"><span>Juros médio</span><strong>${avgKnownRate().toFixed(2).replace('.',',')}% a.m.</strong></div></div></div>
    <div class="debt-tabs"><button class="on" data-v2-view="debtOverviewV2">Resumo</button><button data-v2-view="debtNegotiationsV2">Negociações</button><button data-v2-view="debtSimulatorV2">Simulador</button><button data-v2-view="debtTimelineV2">Histórico</button></div>
    <div class="debt-tools"><button class="debt-tool" data-v2-act="newDebtV2"><b>＋</b><span>Nova dívida</span></button><button class="debt-tool" data-view="accounts"><b>🧾</b><span>Contas vinculadas</span></button></div>
    <div id="debtV2Content">${debtOverviewHtmlV2()}</div>`;
  };

  function debtOverviewHtmlV2(){
    const debts=debtsRaw();
    return debtConceptWarning()+debtStrategyV2()+debtListV2(debts);
  }

  function debtConceptWarning(){
    return `<div class="debt-warning"><strong>Regra de lançamento</strong>Cadastrar dívida não altera saldo e não cria despesa. Pagamento, antecipação ou quitação criam transação. Renegociação parcelada cria contas futuras, não transações imediatas.</div>`;
  }

  function debtStrategyV2(){
    const avalanche=openDebtList().filter(d=>d.interestKnown).slice().sort((a,b)=>Number(b.interestRate||0)-Number(a.interestRate||0));
    const snowball=openDebtList().slice().sort((a,b)=>Number(a.balance||0)-Number(b.balance||0));
    const unknown=openDebtList().filter(d=>!d.interestKnown);
    return `<div class="debt-card"><h3>Estratégia sugerida</h3><p>Use avalanche quando souber juros; use bola de neve quando quiser reduzir quantidade de dívidas; use saldo informado quando o credor só passa valor fechado.</p><div class="strategy-box"><div class="strategy"><h4>Avalanche</h4><ol>${avalanche.slice(0,3).map(d=>`<li>${esc(d.name)} — ${d.interestRate}% a.m. — ${money(d.balance)}</li>`).join('')||'<li>Nenhuma dívida com juros conhecidos.</li>'}</ol></div><div class="strategy"><h4>Bola de neve</h4><ol>${snowball.slice(0,3).map(d=>`<li>${esc(d.name)} — ${money(d.balance)}</li>`).join('')||'<li>Sem dívidas abertas.</li>'}</ol></div><div class="strategy"><h4>Saldo informado</h4><ol>${unknown.slice(0,3).map(d=>`<li>${esc(d.name)} — juros não informado — ${money(d.balance)}</li>`).join('')||'<li>Todas têm juros conhecidos.</li>'}</ol></div></div></div>`;
  }

  function debtListV2(a){
    if(!a.length) return empty('Nenhuma dívida cadastrada.');
    return a.map((d,i)=>debtItemV2(d,i)).join('');
  }

  function debtItemV2(d,i){
    const r=debtRisk(d);
    const pct=d.original?Math.max(0,Math.min(100,Math.round((Number(d.paid||0)/Number(d.original||1))*100))):0;
    const interest=d.interestKnown?`${d.interestRate}% a.m. • ${esc(d.interestType)}`:'Juros não informado';
    const linked=d.linkedBills&&d.linkedBills.length?`<span class="installment-chip">${d.linkedBills.length} conta(s) futura(s)</span>`:'';
    return `<div class="debt-card"><div class="debt-row"><div class="debt-icon">${d.status==='Quitada'?'✓':'!'}</div><div><div class="debt-kind">${esc(d.status)} • ${esc(d.mode)}</div><h4>${esc(d.name)}</h4><small>${esc(d.creditor)} • ${esc(d.kind)} • ${interest} • vence ${esc(d.due)}</small><span class="risk ${r[0]}">${r[1]}</span>${linked}</div><strong>${money(d.balance)}</strong></div><div class="debt-progress"><span style="width:${pct}%"></span></div><div class="actions"><button class="mini primary" data-v2-pay="${i}">Pagar</button><button class="mini" data-v2-advance="${i}">Antecipar</button><button class="mini" data-v2-negotiate="${i}">Renegociar</button><button class="mini" data-v2-adjust="${i}">Ajustar</button><button class="mini danger" data-v2-delete="${i}">Excluir</button></div></div>`;
  }

  function debtRules(){
    vpCurrentScreen='debtRules';
    head('Regras das dívidas','Dívida, conta futura e transação têm papéis diferentes.');
    app.innerHTML=`<div class="debt-card"><h3>Modelo correto</h3><p><b>Dívida</b> é obrigação/passivo. <br><b>Conta</b> é compromisso futuro de pagamento. <br><b>Transação</b> é dinheiro que realmente saiu ou entrou.</p></div><div class="debt-card"><h3>O que cada evento faz</h3><p>Cadastro: cria dívida, sem despesa.<br>Pagamento: reduz dívida e cria despesa.<br>Desconto: reduz dívida, sem despesa.<br>Acréscimo: aumenta dívida, sem despesa.<br>Renegociação parcelada: cria contas futuras, sem despesa imediata.<br>Antecipação: cria despesa pelo valor final pago e registra economia.</p></div>`;
  }

  function debtNegotiationsV2(){
    vpCurrentScreen='debtNegotiationsV2';
    head('Negociações','Acordos, descontos, parcelas e antecipações.');
    const negotiated=debtsRaw().filter(d=>d.status==='Renegociada'||(d.linkedBills&&d.linkedBills.length));
    app.innerHTML=debtConceptWarning()+(negotiated.length?negotiated.map((d,i)=>debtItemV2(d,debtsRaw().findIndex(x=>x.id===d.id))).join(''):empty('Nenhuma renegociação registrada.'));
  }

  function debtSimulatorV2(){
    vpCurrentScreen='debtSimulatorV2';
    head('Simulador','Use quando souber a taxa; se não souber, trabalhe com saldo informado.');
    app.innerHTML=`<div class="debt-card"><h3>Simular quitação</h3><label class="field"><span>Saldo atual</span><input id="simDebtV2" value="${String(totalDebtV2().toFixed(2)).replace('.',',')}"></label><label class="field"><span>Juros mensal (%) opcional</span><input id="simRateV2" value="0"></label><label class="field"><span>Pagamento mensal</span><input id="simPayV2" value="300"></label><button class="btn amber" data-v2-act="runDebtSimV2">Calcular</button></div><div id="simResultV2"></div>`;
  }

  function runDebtSimV2(){
    let balance=parseMoney(val('simDebtV2')), rate=parseMoney(val('simRateV2'))/100, pay=parseMoney(val('simPayV2'));
    if(pay<=0){document.getElementById('simResultV2').innerHTML=card('Informe pagamento','O pagamento mensal precisa ser maior que zero.','red');return;}
    if(rate>0&&pay<=balance*rate){document.getElementById('simResultV2').innerHTML=card('Atenção','O pagamento não cobre os juros estimados; a dívida pode crescer.','red');return;}
    let months=0, interest=0;
    while(balance>0&&months<600){let j=balance*rate;interest+=j;balance+=j;balance-=pay;months++;}
    document.getElementById('simResultV2').innerHTML=`<div class="debt-impact"><div class="debt-card"><h3>Prazo estimado</h3><p>${months} meses</p></div><div class="debt-card"><h3>Juros estimados</h3><p>${money(interest)}</p></div></div>`;
  }

  function debtTimelineV2(){
    vpCurrentScreen='debtTimelineV2';
    head('Histórico de eventos','Linha do tempo sem misturar cadastro com pagamento.');
    const logs=[];
    debtsRaw().forEach(d=>(d.history||[]).forEach(h=>logs.push(Object.assign({debt:d.name},h))));
    logs.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    app.innerHTML=`<div class="timeline-log">${logs.length?logs.map(l=>`<div class="log-item"><b>${esc(l.debt)} — ${esc(l.type)}</b><small>${esc(l.date)} • ${money(l.value)} • ${esc(l.note||'')} • ${esc(l.effect||'neutral')}</small></div>`).join(''):empty('Sem histórico.')}</div>`;
  }

  function newDebtV2Form(){
    form('Nova dívida',[{id:'v2Name',label:'Nome da dívida'},{id:'v2Creditor',label:'Credor'},{id:'v2Kind',label:'Tipo',options:['Cartão de crédito','Cheque especial','Empréstimo pessoal','Financiamento','Boleto atrasado','Acordo parcelado','Outro']},{id:'v2Mode',label:'Como controlar?',options:DEBT_MODES},{id:'v2Original',label:'Valor original / contratado'},{id:'v2Balance',label:'Saldo atual informado'},{id:'v2InterestKnown',label:'Sabe os juros?',options:['Não','Sim']},{id:'v2Rate',label:'Juros mensal (%) - opcional',value:'0'},{id:'v2Min',label:'Pagamento mínimo mensal - opcional',value:'0'},{id:'v2Due',label:'Vencimento',value:today()},{id:'v2Status',label:'Status',options:DEBT_STATUS},{id:'v2Notes',label:'Observações'}],'saveDebtV2');
  }

  function saveDebtV2(){
    const original=parseMoney(val('v2Original'));
    const balance=parseMoney(val('v2Balance'))||original;
    const known=val('v2InterestKnown')==='Sim';
    const d={id:nowId(),name:val('v2Name')||'Dívida',creditor:val('v2Creditor')||'Não informado',kind:val('v2Kind')||'Outro',original:original,balance:balance,paid:0,interestKnown:known,interestRate:known?parseMoney(val('v2Rate')):null,interestType:known?'Mensal informado':'Não informado',mode:val('v2Mode')||'Saldo informado',minPayment:parseMoney(val('v2Min')),due:val('v2Due')||today(),status:val('v2Status')||'Em aberto',priority:'Média',notes:val('v2Notes')||'',linkedBills:[],installments:[],history:[eventObj('Cadastro',balance,'Dívida registrada. Nenhuma transação foi criada.','neutral')]};
    const a=debtsRaw(); a.push(d); saveDebtsV2(a); closeSheet(); debts();
  }

  function openPayDebt(i){
    const d=debtsRaw()[i]; if(!d)return;
    openSheet(`<h2>Pagar dívida</h2><p class="meta">Pagamento real: cria despesa e reduz saldo.</p><label class="field"><span>Valor pago</span><input id="v2PayValue"></label><label class="field"><span>Quanto reduzir do saldo?</span><input id="v2ReduceValue" value=""></label><label class="field"><span>Data</span><input id="v2PayDate" value="${today()}"></label><label class="field"><span>Observação</span><input id="v2PayNote" value="Pagamento da dívida"></label><div class="row"><button class="btn alt" data-act="close">Cancelar</button><button class="btn" data-v2-save-pay="${i}">Salvar</button></div>`);
  }

  function savePayDebt(i){
    const a=debtsRaw(), d=a[i]; if(!d)return;
    const paid=parseMoney(val('v2PayValue'));
    const reduce=parseMoney(val('v2ReduceValue'))||paid;
    if(paid<=0||reduce<=0)return;
    d.paid=Number(d.paid||0)+paid;
    d.balance=Math.max(0,Number(d.balance||0)-reduce);
    if(d.balance<=0)d.status='Quitada'; else if(d.status==='Em aberto'||d.status==='Em atraso')d.status='Em pagamento';
    d.history.push(eventObj('Pagamento',paid,`Reduziu saldo em ${money(reduce)}. ${val('v2PayNote')||''}`,'transaction',{transaction:true,balanceReduction:reduce}));
    a[i]=d; saveDebtsV2(a);
    const tx=db.get('tx',[]); tx.push({type:'despesa',value:paid,desc:'Pagamento de dívida: '+d.name,cat:'Dívidas',wallet:'Principal',date:val('v2PayDate')||today()}); db.set('tx',tx);
    closeSheet(); debts();
  }

  function openAdvanceDebt(i){
    const d=debtsRaw()[i]; if(!d)return;
    openSheet(`<h2>Antecipar parcela</h2><p class="meta">Registre o valor original da parcela e o valor final pago com desconto.</p><label class="field"><span>Valor original da parcela</span><input id="v2AdvOriginal"></label><label class="field"><span>Valor final pago</span><input id="v2AdvPaid"></label><label class="field"><span>Data</span><input id="v2AdvDate" value="${today()}"></label><div class="row"><button class="btn alt" data-act="close">Cancelar</button><button class="btn" data-v2-save-advance="${i}">Salvar</button></div>`);
  }

  function saveAdvanceDebt(i){
    const a=debtsRaw(), d=a[i]; if(!d)return;
    const original=parseMoney(val('v2AdvOriginal'));
    const paid=parseMoney(val('v2AdvPaid'));
    if(original<=0||paid<=0)return;
    const saving=Math.max(0,original-paid);
    d.paid=Number(d.paid||0)+paid;
    d.balance=Math.max(0,Number(d.balance||0)-original);
    if(d.balance<=0)d.status='Quitada'; else d.status='Em pagamento';
    d.installments.push({id:nowId(),original:original,paid:paid,saving:saving,date:val('v2AdvDate')||today(),status:'Antecipada'});
    d.history.push(eventObj('Antecipação',paid,`Parcela original ${money(original)}. Economia ${money(saving)}.`,'transaction',{transaction:true,saving:saving,balanceReduction:original}));
    a[i]=d; saveDebtsV2(a);
    const tx=db.get('tx',[]); tx.push({type:'despesa',value:paid,desc:'Antecipação de dívida: '+d.name,cat:'Dívidas',wallet:'Principal',date:val('v2AdvDate')||today()}); db.set('tx',tx);
    closeSheet(); debts();
  }

  function openAdjustDebt(i){
    const d=debtsRaw()[i]; if(!d)return;
    openSheet(`<h2>Ajustar dívida</h2><p class="meta">Use quando não souber juros exatos ou o credor informar novo saldo.</p><label class="field"><span>Tipo de ajuste</span><select id="v2AdjustType"><option>Correção de saldo</option><option>Acréscimo</option><option>Desconto/abatimento</option><option>Contestação</option></select></label><label class="field"><span>Valor</span><input id="v2AdjustValue"></label><label class="field"><span>Observação</span><input id="v2AdjustNote"></label><div class="row"><button class="btn alt" data-act="close">Cancelar</button><button class="btn" data-v2-save-adjust="${i}">Salvar</button></div>`);
  }

  function saveAdjustDebt(i){
    const a=debtsRaw(), d=a[i]; if(!d)return;
    const type=val('v2AdjustType'), value=parseMoney(val('v2AdjustValue'));
    if(type==='Correção de saldo'){ d.balance=value; d.history.push(eventObj('Correção manual',value,val('v2AdjustNote')||'Saldo corrigido conforme informação do credor.','neutral')); }
    else if(type==='Acréscimo'){ d.balance=Number(d.balance||0)+value; d.original=Number(d.original||0)+value; d.history.push(eventObj('Acréscimo',value,val('v2AdjustNote')||'Juros, multa ou encargos.','increase')); }
    else if(type==='Desconto/abatimento'){ d.balance=Math.max(0,Number(d.balance||0)-value); d.history.push(eventObj('Desconto',value,val('v2AdjustNote')||'Desconto/abatimento negociado.','decrease')); }
    else { d.status='Contestada'; d.history.push(eventObj('Contestação',0,val('v2AdjustNote')||'Dívida marcada como contestada.','neutral')); }
    if(d.balance<=0)d.status='Quitada';
    a[i]=d; saveDebtsV2(a); closeSheet(); debts();
  }

  function openNegotiateDebt(i){
    const d=debtsRaw()[i]; if(!d)return;
    openSheet(`<h2>Renegociar dívida completa</h2><p class="meta">Renegociação não é pagamento. Parcelas viram contas futuras.</p><label class="field"><span>Novo valor acordado</span><input id="v2NegValue" value="${String(d.balance).replace('.',',')}"></label><label class="field"><span>Quantidade de parcelas</span><input id="v2NegParts" value="1"></label><label class="field"><span>Primeiro vencimento</span><input id="v2NegDue" value="${today()}"></label><label class="field"><span>Observação</span><input id="v2NegNote" value="Acordo renegociado"></label><div class="row"><button class="btn alt" data-act="close">Cancelar</button><button class="btn" data-v2-save-negotiate="${i}">Salvar</button></div>`);
  }

  function saveNegotiateDebt(i){
    const a=debtsRaw(), d=a[i]; if(!d)return;
    const old=Number(d.balance||0), agreed=parseMoney(val('v2NegValue')), parts=Math.max(1,parseInt(val('v2NegParts')||'1',10));
    const saving=Math.max(0,old-agreed);
    d.balance=agreed;
    d.status=parts>1?'Renegociada':'Em negociação';
    d.history.push(eventObj('Renegociação',agreed,`Saldo anterior ${money(old)}. Economia/abatimento ${money(saving)}. ${val('v2NegNote')||''}`,'neutral',{saving:saving,installments:parts}));
    const bills=db.get('bills',[]), each=agreed/parts, ids=[];
    for(let p=1;p<=parts;p++){
      const bill={id:nowId(),name:`Parcela ${p}/${parts} - ${d.name}`,flow:'A_PAGAR',expected:each,final:0,due:p===1?(val('v2NegDue')||today()):'Próximo ciclo',cat:'Dívidas',wallet:'Principal',status:'PENDENTE',repeat:'Nenhuma',notes:`Conta vinculada à dívida ${d.id}. Renegociação parcelada.`};
      bills.push(bill); ids.push(bill.id);
    }
    d.linkedBills=(d.linkedBills||[]).concat(ids);
    a[i]=d; saveDebtsV2(a); db.set('bills',bills); closeSheet(); debts();
  }

  function deleteDebtV2(i){ const a=debtsRaw(); a.splice(i,1); saveDebtsV2(a); debts(); }

  const previousFin=window.fin;
  window.fin=function(){
    previousFin();
    const page=document.querySelector('.mf-page');
    if(!page)return;
    const total=totalDebtV2(), future=futureDebtBills().reduce((s,b)=>s+Number(b.expected||0),0), unknown=openDebtList().filter(d=>!d.interestKnown).length;
    page.insertAdjacentHTML('beforeend',`<div class="mf-section"><div class="debt-card"><h3>Dívidas integradas</h3><p>Saldo vivo: <b>${money(total)}</b><br>Parcelas futuras em Contas: <b>${money(future)}</b><br>Dívidas com juros não informado: <b>${unknown}</b></p><div class="actions"><button class="mini primary" data-go="debts">Abrir dívidas</button><button class="mini" data-view="forecast">Ver previsão</button></div></div></div>`);
  };

  const previousForecast=window.forecast;
  window.forecast=function(){
    vpCurrentScreen='forecast';
    head('Previsão','Saldo futuro considerando contas, recorrências e pagamentos mínimos de dívidas.');
    const current=sum('receita')-sum('despesa');
    const recurring=db.get('subs',[]).filter(s=>s.status!=='Pausada').reduce((a,s)=>a+Number(s.value||0),0);
    const bills=db.get('bills',[]);
    const payable=bills.filter(b=>b.flow==='A_PAGAR'&&b.status==='PENDENTE').reduce((s,b)=>s+Number(b.expected||0),0);
    const receivable=bills.filter(b=>b.flow==='A_RECEBER'&&b.status==='PENDENTE').reduce((s,b)=>s+Number(b.expected||0),0);
    const minDebt=openDebtList().filter(d=>!(d.linkedBills&&d.linkedBills.length)).reduce((s,d)=>s+Number(d.minPayment||0),0);
    const projected=current+receivable-payable-recurring-minDebt;
    app.innerHTML=`<div class="grid">${metric('Saldo atual',money(current),current>=0?'green':'red')}${metric('A receber',money(receivable),'green')}${metric('A pagar',money(payable+recurring),'red')}${metric('Mín. dívidas',money(minDebt),'amber')}</div>`+card('Previsão limpa',`Parcelas renegociadas entram em Contas; dívidas sem acordo entram pelo pagamento mínimo. Saldo projetado: <b>${money(projected)}</b>.`,projected>=0?'green':'amber');
  };

  views.debtOverviewV2=function(){ debts(); };
  views.debtRules=debtRules;
  views.debtNegotiationsV2=debtNegotiationsV2;
  views.debtSimulatorV2=debtSimulatorV2;
  views.debtTimelineV2=debtTimelineV2;
  acts.newDebtV2=newDebtV2Form;
  acts.saveDebtV2=saveDebtV2;
  acts.runDebtSimV2=runDebtSimV2;

  const oldContext=window.contextAdd;
  window.contextAdd=function(){
    if(['debts','debtRules','debtNegotiationsV2','debtSimulatorV2','debtTimelineV2'].includes(vpCurrentScreen)) return newDebtV2Form();
    return oldContext?oldContext():quickAdd();
  };

  document.body.addEventListener('click',function(e){
    const view=e.target.closest('[data-v2-view]'); if(view){ const fn=views[view.dataset.v2View]; if(fn)fn(); return; }
    const act=e.target.closest('[data-v2-act]'); if(act){ const fn=acts[act.dataset.v2Act]; if(fn)fn(); return; }
    const pay=e.target.closest('[data-v2-pay]'); if(pay){openPayDebt(Number(pay.dataset.v2Pay));return;}
    const adv=e.target.closest('[data-v2-advance]'); if(adv){openAdvanceDebt(Number(adv.dataset.v2Advance));return;}
    const neg=e.target.closest('[data-v2-negotiate]'); if(neg){openNegotiateDebt(Number(neg.dataset.v2Negotiate));return;}
    const adj=e.target.closest('[data-v2-adjust]'); if(adj){openAdjustDebt(Number(adj.dataset.v2Adjust));return;}
    const del=e.target.closest('[data-v2-delete]'); if(del){deleteDebtV2(Number(del.dataset.v2Delete));return;}
    const sp=e.target.closest('[data-v2-save-pay]'); if(sp){savePayDebt(Number(sp.dataset.v2SavePay));return;}
    const sa=e.target.closest('[data-v2-save-advance]'); if(sa){saveAdvanceDebt(Number(sa.dataset.v2SaveAdvance));return;}
    const sadj=e.target.closest('[data-v2-save-adjust]'); if(sadj){saveAdjustDebt(Number(sadj.dataset.v2SaveAdjust));return;}
    const sn=e.target.closest('[data-v2-save-negotiate]'); if(sn){saveNegotiateDebt(Number(sn.dataset.v2SaveNegotiate));return;}
  });

  saveDebtsV2(debtsRaw());
  renderNav();
  if(route==='debts') debts();
})();
