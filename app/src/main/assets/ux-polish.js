// Camada de UX, clean code e design behavior.
// Objetivo: melhorar feedback, prevenção de erro, consistência, acessibilidade e comportamento contextual.

(function(){
  const state={lastDeleted:null,toastTimer:null};

  function showToast(message,undo){
    let old=document.querySelector('.ux-toast');
    if(old) old.remove();
    const box=document.createElement('div');
    box.className='ux-toast';
    box.innerHTML='<span></span>'+(undo?'<button type="button">Desfazer</button>':'');
    box.querySelector('span').textContent=message;
    if(undo){
      box.querySelector('button').addEventListener('click',function(){
        restoreDeleted();
        box.remove();
      });
    }
    document.body.appendChild(box);
    clearTimeout(state.toastTimer);
    state.toastTimer=setTimeout(()=>box.remove(),4200);
  }

  function restoreDeleted(){
    if(!state.lastDeleted) return;
    const a=db.get(state.lastDeleted.key,[]);
    a.splice(state.lastDeleted.index,0,state.lastDeleted.item);
    db.set(state.lastDeleted.key,a);
    state.lastDeleted=null;
    showToast('Item restaurado.',false);
    refresh();
  }

  const originalDel=window.del;
  window.del=function(key,index){
    const a=db.get(key,[]);
    const item=a[index];
    if(!item){ refresh(); return; }
    a.splice(index,1);
    db.set(key,a);
    state.lastDeleted={key:key,index:index,item:item};
    showToast('Item excluído.',true);
    refresh();
  };

  const originalOpenSheet=window.openSheet;
  window.openSheet=function(html){
    originalOpenSheet(html);
    const first=sheet.querySelector('input,select,textarea,button');
    if(first) setTimeout(()=>first.focus(),60);
  };

  function addScreenHint(){
    const existing=document.querySelector('.ux-strip');
    if(existing) return;
    let hint='Use o botão + para adicionar o item principal desta tela.';
    if(vpCurrentScreen==='accounts') hint='Contas controlam vencimentos, valor previsto e valor final pago/recebido.';
    else if(vpCurrentScreen==='transactions') hint='Transações alteram seu saldo imediatamente.';
    else if(vpCurrentScreen==='budget') hint='Orçamentos ajudam a evitar estouro de categoria antes do fim do mês.';
    else if(vpCurrentScreen==='forecast') hint='A previsão combina saldo, contas, recorrências e dívidas.';
    else if(vpCurrentScreen==='debts') hint='Dívidas só devem gerar despesa quando você registrar pagamento.';
    else if(vpCurrentScreen==='inbox') hint='Inbox é captura rápida: registre primeiro, organize depois.';
    else if(vpCurrentScreen==='kanban') hint='Toque em um card para avançar entre A Fazer, Em Andamento e Concluído.';
    const strip=document.createElement('div');
    strip.className='ux-strip';
    strip.innerHTML='<strong>Dica desta tela</strong><small>'+hint+'</small>';
    app.prepend(strip);
  }

  function auditFinance(){
    const bills=db.get('bills',[]);
    const unpaid=bills.filter(b=>b.status==='PENDENTE'&&b.flow==='A_PAGAR').reduce((s,b)=>s+Number(b.expected||0),0);
    const receivable=bills.filter(b=>b.status==='PENDENTE'&&b.flow==='A_RECEBER').reduce((s,b)=>s+Number(b.expected||0),0);
    const result=sum('receita')-sum('despesa')+receivable-unpaid-debtRest();
    return {unpaid,receivable,result};
  }

  const oldFin=window.fin;
  window.fin=function(){
    vpCurrentScreen='fin';
    oldFin();
    const a=auditFinance();
    const status=a.result>=0?'ux-good':'ux-warning';
    const text=a.result>=0?'Seu cenário projetado está positivo.':'Cenário projetado negativo: revise contas, dívidas ou despesas.';
    app.insertAdjacentHTML('afterbegin',card('Diagnóstico financeiro',`${text}<br>A pagar: ${money(a.unpaid)} • A receber: ${money(a.receivable)} • Projetado: ${money(a.result)}`,a.result>=0?'green':'amber').replace('card','card '+status));
  };

  const wrapNames=['home','prod','inbox','lists','calendar','focus','habits','counts','kanban','timeline','stats','notes','search','transactions','accounts','categories','wallets','budget','subscriptions','forecast','netWorth','rules','goals','debts','reports','importView','settings'];
  wrapNames.forEach(function(name){
    if(typeof window[name]==='function'){
      const old=window[name];
      window[name]=function(){
        const out=old.apply(this,arguments);
        setTimeout(addScreenHint,0);
        return out;
      };
    }
  });

  const oldSaveBillClose=window.saveBillClose;
  if(typeof oldSaveBillClose==='function'){
    window.saveBillClose=function(i){
      oldSaveBillClose(i);
      showToast('Conta liquidada e transação registrada.',false);
    };
  }

  const oldSaveTx=window.saveTx;
  if(typeof oldSaveTx==='function'){
    window.saveTx=function(){
      oldSaveTx();
      showToast('Transação salva.',false);
    };
  }

  const oldSaveTask=window.saveTask;
  if(typeof oldSaveTask==='function'){
    window.saveTask=function(){
      oldSaveTask();
      showToast('Tarefa adicionada.',false);
    };
  }

  document.addEventListener('keydown',function(e){
    if(e.key==='Escape') closeSheet();
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
      e.preventDefault();
      go('prod');
      if(views.search) views.search();
    }
  });

  renderNav();
  refresh();
})();
