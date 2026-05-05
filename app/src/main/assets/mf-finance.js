// Redesign específico da aba Finanças inspirado no fluxo do app Minhas Finanças.
// Não copia marca, código ou assets; aplica padrões de UX: resumo mensal, atalhos, contas, cartões, orçamento, calendário e extrato.

(function(){
  function mfCurrentMonth(){
    return new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).replace(/^./,c=>c.toUpperCase());
  }

  function mfTx(){ return db.get('tx',[]); }
  function mfBills(){ return db.get('bills',[]); }
  function mfCards(){ return db.get('creditCards',[]); }

  function ensureMfSeed(){
    if(!localStorage.vpMfSeed){
      db.set('creditCards',[
        {name:'Cartão Principal',limit:1200,used:280,closeDay:'20',dueDay:'28',status:'Aberto'},
        {name:'Cartão Reserva',limit:800,used:0,closeDay:'05',dueDay:'12',status:'Aberto'}
      ]);
      localStorage.vpMfSeed='1';
    }
  }
  ensureMfSeed();

  window.fin=function(){
    vpCurrentScreen='fin';
    head('Finanças','Resumo mensal, contas, cartões, orçamento e extrato.');
    const inc=sum('receita'), exp=sum('despesa'), bal=inc-exp;
    const bills=mfBills();
    const payable=bills.filter(b=>b.flow==='A_PAGAR'&&b.status==='PENDENTE').reduce((s,b)=>s+Number(b.expected||0),0);
    const receivable=bills.filter(b=>b.flow==='A_RECEBER'&&b.status==='PENDENTE').reduce((s,b)=>s+Number(b.expected||0),0);
    const privateOn=localStorage.vpPrivateMode==='1';
    app.innerHTML=`<div class="mf-page ${privateOn?'mf-private':''}">
      <section class="mf-hero">
        <div class="mf-topline"><div class="mf-brand">VivoPreco Finanças</div><button class="mf-private-toggle" data-act="togglePrivate">${privateOn?'Mostrar':'Privado'}</button></div>
        <button class="mf-period" data-view="mfCalendar">◀ ${mfCurrentMonth()} ▶</button>
        <div class="mf-balance-label">Saldo atual</div>
        <div class="mf-balance mf-money">${money(bal)}</div>
        <div class="mf-hero-grid">
          <div class="mf-mini"><span>Receitas</span><strong class="mf-money">${money(inc)}</strong></div>
          <div class="mf-mini"><span>Despesas</span><strong class="mf-money">${money(exp)}</strong></div>
          <div class="mf-mini"><span>A receber</span><strong class="mf-money">${money(receivable)}</strong></div>
          <div class="mf-mini"><span>A pagar</span><strong class="mf-money">${money(payable)}</strong></div>
        </div>
      </section>
      <section class="mf-tabs">
        <button class="on" data-view="mfOverview">Resumo</button>
        <button data-view="transactions">Extrato</button>
        <button data-view="accounts">Contas</button>
        <button data-view="mfCards">Cartões</button>
        <button data-view="budget">Orçamento</button>
        <button data-view="goals">Metas</button>
        <button data-view="reports">Relatórios</button>
      </section>
      <section class="mf-section" id="mfContent">${mfOverviewHtml()}</section>
    </div>`;
  };

  function mfOverviewHtml(){
    return mfQuickActions()+mfChart()+mfCardsPreview()+mfBudgetPreview()+mfBillsPreview()+mfExtractPreview()+mfCalendarPreview();
  }

  function mfQuickActions(){
    return `<div class="mf-actions">
      <button class="mf-action" data-act="tx"><b>＋</b><span>Transação</span></button>
      <button class="mf-action" data-act="bill"><b>🧾</b><span>Conta</span></button>
      <button class="mf-action" data-act="creditCard"><b>💳</b><span>Cartão</span></button>
      <button class="mf-action" data-act="budget"><b>🎯</b><span>Orçamento</span></button>
    </div>`;
  }

  function mfChart(){
    const cats={};
    mfTx().filter(t=>t.type==='despesa').forEach(t=>cats[t.cat||'Geral']=(cats[t.cat||'Geral']||0)+Number(t.value||0));
    const entries=Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,4);
    const total=entries.reduce((s,e)=>s+e[1],0);
    const colors=['#dc2626','#d97706','#7c3aed','#2563eb'];
    return `<div class="mf-card"><h3>Despesas por categoria</h3><div class="mf-chart-row"><div class="mf-donut"></div><div class="mf-legend">${entries.length?entries.map((e,i)=>`<div><span><i class="mf-dot" style="background:${colors[i]}"></i>${esc(e[0])}</span><b class="mf-money">${money(e[1])}</b></div>`).join(''):'<p>Nenhuma despesa registrada.</p>'}<div><span>Total</span><b class="mf-money">${money(total)}</b></div></div></div></div>`;
  }

  function mfCardsPreview(){
    const cards=mfCards();
    if(!cards.length) return `<div class="mf-card"><h3>Cartões</h3><p>Nenhum cartão cadastrado.</p>${btn('+ Adicionar cartão','creditCard')}</div>`;
    return cards.slice(0,2).map((c,i)=>`<div class="mf-credit"><small>${esc(c.name)}</small><h3 class="mf-money">${money(c.used)} usados</h3><p>Limite: <span class="mf-money">${money(c.limit)}</span></p><div class="mf-progress"><span style="width:${Math.min(100,Math.round((c.used/c.limit)*100))}%;background:#60a5fa"></span></div><div class="mf-credit-row"><div><span>Fecha</span><strong>${esc(c.closeDay)}</strong></div><div><span>Vence</span><strong>${esc(c.dueDay)}</strong></div><div><span>Status</span><strong>${esc(c.status)}</strong></div></div><div class="actions"><button class="mini primary" data-card-purchase="${i}">Lançar compra</button><button class="mini" data-view="mfCards">Ver cartões</button></div></div>`).join('');
  }

  function mfBudgetPreview(){
    const budgets=db.get('budgets',[]);
    if(!budgets.length) return `<div class="mf-card"><h3>Orçamentos</h3><p>Crie limites por categoria para acompanhar o mês.</p>${btn('+ Criar orçamento','budget','amber')}</div>`;
    return `<div class="mf-card"><h3>Orçamentos do mês</h3>${budgets.slice(0,4).map(b=>{
      const spent=mfTx().filter(t=>t.type==='despesa'&&t.cat===b.cat).reduce((s,t)=>s+Number(t.value||0),0);
      const pct=b.limit?Math.round((spent/b.limit)*100):0;
      const col=pct>=100?'#dc2626':pct>=80?'#d97706':'#16a34a';
      return `<div class="mf-budget"><div class="mf-budget-head"><span>${esc(b.cat)}</span><span class="mf-money-muted">${money(spent)} / ${money(b.limit)}</span></div><div class="mf-progress"><span style="width:${Math.min(100,pct)}%;background:${col}"></span></div></div>`;
    }).join('')}</div>`;
  }

  function mfBillsPreview(){
    const bills=mfBills().filter(b=>b.status==='PENDENTE').slice(0,4);
    return `<div class="mf-card"><h3>Próximas contas</h3>${bills.length?`<div class="mf-list">${bills.map((b,i)=>`<div class="mf-entry"><div class="mf-icon" style="background:${b.flow==='A_PAGAR'?'#fee2e2':'#dcfce7'}">${b.flow==='A_PAGAR'?'↓':'↑'}</div><div><h4>${esc(b.name)}</h4><small>${esc(b.due)} • ${esc(b.cat)}</small></div><strong class="${b.flow==='A_PAGAR'?'mf-expense':'mf-income'} mf-money">${money(b.expected)}</strong></div>`).join('')}</div>`:'<p>Nenhuma conta pendente.</p>'}<div class="actions"><button class="mini primary" data-view="accounts">Ver contas</button><button class="mini" data-act="bill">Nova conta</button></div></div>`;
  }

  function mfExtractPreview(){
    const tx=mfTx().slice().reverse().slice(0,5);
    return `<div class="mf-card"><h3>Últimos lançamentos</h3>${tx.length?`<div class="mf-list">${tx.map(t=>`<div class="mf-entry"><div class="mf-icon" style="background:${t.type==='receita'?'#dcfce7':'#fee2e2'}">${t.type==='receita'?'＋':'−'}</div><div><h4>${esc(t.desc)}</h4><small>${esc(t.cat)} • ${esc(t.wallet)} • ${esc(t.date)}</small></div><strong class="${t.type==='receita'?'mf-income':'mf-expense'} mf-money">${money(t.value)}</strong></div>`).join('')}</div>`:'<p>Nenhum lançamento.</p>'}<div class="actions"><button class="mini primary" data-view="transactions">Ver extrato</button></div></div>`;
  }

  function mfCalendarPreview(){
    const bills=mfBills().filter(b=>b.status==='PENDENTE');
    let days='';
    for(let i=1;i<=28;i++){
      const hit=bills.find(b=>String(b.due).startsWith(String(i).padStart(2,'0'))||String(b.due).startsWith(String(i)));
      days+=`<div class="mf-day ${hit?(hit.flow==='A_PAGAR'?'pay':'has'):''}">${i}${hit?'<br>•':''}</div>`;
    }
    return `<div class="mf-card"><h3>Calendário financeiro</h3><div class="mf-calendar">${days}</div><div class="actions"><button class="mini primary" data-view="mfCalendar">Abrir calendário</button></div></div>`;
  }

  function mfCards(){
    vpCurrentScreen='mfCards';
    head('Cartões','Faturas, limite, vencimento e compras do cartão.');
    const cards=mfCardsData();
    app.innerHTML=btn('+ Novo cartão','creditCard')+(cards.length?cards.map((c,i)=>`<div class="mf-credit"><small>${esc(c.name)}</small><h3>${money(c.used)} usados</h3><p>Limite total: ${money(c.limit)}</p><div class="mf-progress"><span style="width:${Math.min(100,Math.round((c.used/c.limit)*100))}%;background:#60a5fa"></span></div><div class="mf-credit-row"><div><span>Fecha</span><strong>${esc(c.closeDay)}</strong></div><div><span>Vence</span><strong>${esc(c.dueDay)}</strong></div><div><span>Livre</span><strong>${money(Math.max(0,c.limit-c.used))}</strong></div></div><div class="actions"><button class="mini primary" data-card-purchase="${i}">Lançar compra</button><button class="mini danger" data-del-card="${i}">Excluir</button></div></div>`).join(''):empty('Nenhum cartão cadastrado.'));
  }

  function mfCardsData(){ return db.get('creditCards',[]); }

  function mfCalendar(){
    vpCurrentScreen='mfCalendar';
    head('Calendário financeiro','Vencimentos de contas e compromissos do mês.');
    const bills=mfBills();
    let days='';
    for(let i=1;i<=31;i++){
      const dayItems=bills.filter(b=>String(b.due).startsWith(String(i).padStart(2,'0'))||String(b.due).startsWith(String(i)));
      const pay=dayItems.some(b=>b.flow==='A_PAGAR');
      days+=`<div class="mf-day ${dayItems.length?(pay?'pay':'has'):''}">${i}${dayItems.length?'<br>'+dayItems.length+' item':''}</div>`;
    }
    app.innerHTML=`<div class="mf-card"><h3>${mfCurrentMonth()}</h3><div class="mf-calendar">${days}</div></div>`+bills.map((b,i)=>billItem(b,i)).join('');
  }

  function mfOverview(){ fin(); }

  function creditCardForm(){
    form('Novo cartão',[{id:'ccName',label:'Nome do cartão'},{id:'ccLimit',label:'Limite total'},{id:'ccUsed',label:'Valor já utilizado',value:'0'},{id:'ccClose',label:'Dia de fechamento',value:'20'},{id:'ccDue',label:'Dia de vencimento',value:'28'}],'saveCreditCard');
  }

  function saveCreditCard(){
    const a=mfCardsData();
    a.push({name:val('ccName')||'Cartão',limit:parseMoney(val('ccLimit')),used:parseMoney(val('ccUsed')),closeDay:val('ccClose')||'20',dueDay:val('ccDue')||'28',status:'Aberto'});
    db.set('creditCards',a);closeSheet();mfCards();
  }

  function cardPurchase(i){
    openSheet(`<h2>Lançar compra</h2><label class="field"><span>Descrição</span><input id="cpDesc"></label><label class="field"><span>Valor</span><input id="cpValue"></label><label class="field"><span>Categoria</span><input id="cpCat" value="Cartão"></label><div class="row"><button class="btn alt" data-act="close">Cancelar</button><button class="btn" data-save-card-purchase="${i}">Salvar</button></div>`);
  }

  function saveCardPurchase(i){
    const cards=mfCardsData(); const c=cards[i]; if(!c)return;
    const value=parseMoney(val('cpValue'));
    c.used=Number(c.used||0)+value;
    cards[i]=c; db.set('creditCards',cards);
    const tx=mfTx();
    tx.push({type:'despesa',value:value,desc:val('cpDesc')||'Compra no cartão',cat:val('cpCat')||'Cartão',wallet:c.name,date:today()});
    db.set('tx',tx);closeSheet();mfCards();
  }

  views.mfOverview=mfOverview;
  views.mfCards=mfCards;
  views.mfCalendar=mfCalendar;
  acts.creditCard=creditCardForm;
  acts.saveCreditCard=saveCreditCard;

  const oldContextAdd=window.contextAdd;
  window.contextAdd=function(){
    if(vpCurrentScreen==='fin') return txForm();
    if(vpCurrentScreen==='mfCards') return creditCardForm();
    if(vpCurrentScreen==='mfCalendar') return billForm();
    return oldContextAdd ? oldContextAdd() : quickAdd();
  };

  document.body.addEventListener('click',function(e){
    const purchase=e.target.closest('[data-card-purchase]'); if(purchase){cardPurchase(Number(purchase.dataset.cardPurchase));return;}
    const save=e.target.closest('[data-save-card-purchase]'); if(save){saveCardPurchase(Number(save.dataset.saveCardPurchase));return;}
    const del=e.target.closest('[data-del-card]'); if(del){const a=mfCardsData();a.splice(Number(del.dataset.delCard),1);db.set('creditCards',a);mfCards();return;}
  });

  renderNav();
  if(route==='fin') fin();
})();
