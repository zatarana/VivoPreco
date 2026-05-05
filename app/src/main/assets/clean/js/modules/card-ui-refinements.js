window.CardUIRefinements=(function(){
  function moneyValue(id){return window.MoneyMask?MoneyMask.parse(Dom.$('#'+id).value):Validators.normalizeMoney(Dom.$('#'+id).value);}
  function monthNow(){return new Date().toISOString().slice(0,7);}
  function walletName(data,id){return ((data.wallets||[]).find(w=>w.id===id)||{}).name||'Conta financeira';}
  function walletIdFromName(data,name){return ((data.wallets||[]).find(w=>w.name===name)||(data.wallets||[])[0]||{}).id;}
  function cardById(data,id){return PlanningEngine.cardById(data,id);}
  function purchaseById(data,id){return PlanningEngine.purchaseById(data,id);}
  function showCards(data){
    PlanningEngine.ensure(data);
    Dom.setHeader('Cartões','Compras, parcelas, faturas, limites e vencimentos.');
    Dom.render(`${Components.button('+ Cartão','newCard')}<div class="list compact-list">${data.cards.length?data.cards.map(c=>cardItem(data,c)).join(''):Components.empty('Nenhum cartão cadastrado.')}</div>`);
  }
  function cardItem(data,c){
    const open=PlanningEngine.cardOpenTotal(data,c.id);
    const available=PlanningEngine.cardAvailableLimit(data,c.id);
    return `<div class="item compact-item danger-accent"><h4>${Dom.esc(c.name)} ${c.active?'<span class="pill">Ativo</span>':'<span class="pill">Inativo</span>'}</h4><div class="meta">Limite ${Dom.money(c.limit)} • Usado aberto ${Dom.money(open)} • Disponível ${Dom.money(available)} • Fecha dia ${c.closingDay} • Vence dia ${c.dueDay} • ${walletName(data,c.walletId)}</div>${Components.actions([Components.mini('Abrir','openCard',c.id,'primary'),Components.mini('+ Compra','newCardPurchase',c.id),Components.mini('Fechar fatura','closeCardInvoice',c.id)],[Components.mini('Editar','editCard',c.id),Components.mini('Excluir','deleteCard',c.id,'danger')])}</div>`;
  }
  function openCard(id){
    const data=StorageService.read();
    PlanningEngine.ensure(data);
    const c=cardById(data,id);
    if(!c)return;
    const purchases=(data.cardPurchases||[]).filter(p=>p.cardId===id).slice().sort((a,b)=>String(a.invoiceMonth).localeCompare(String(b.invoiceMonth))||String(a.description).localeCompare(String(b.description))||Number(a.installmentNumber||1)-Number(b.installmentNumber||1));
    Dom.setHeader(c.name,'Compras abertas, parcelas, limite e faturas.');
    Dom.render(`<div class="grid compact-grid">${Components.metric('Limite',Dom.money(c.limit),'primary')}${Components.metric('Usado aberto',Dom.money(PlanningEngine.cardOpenTotal(data,id)),'danger')}${Components.metric('Disponível',Dom.money(PlanningEngine.cardAvailableLimit(data,id)),PlanningEngine.cardAvailableLimit(data,id)>=0?'success':'danger')}${Components.metric('Parcelas abertas',String(purchases.filter(p=>!p.billId).length),'warning')}</div><div class="quick-actions">${Components.button('+ Compra','newCardPurchase','secondary').replace('data-action="newCardPurchase"','data-action="newCardPurchase" data-id="'+id+'"')}${Components.button('Fechar fatura','closeCardInvoice','primary').replace('data-action="closeCardInvoice"','data-action="closeCardInvoice" data-id="'+id+'"')}</div><h2 class="section">Compras e parcelas</h2>${purchases.length?purchases.map(p=>purchaseItem(p)).join(''):Components.empty('Nenhuma compra neste cartão.')}`);
  }
  function purchaseItem(p){
    const installments=Number(p.installments||1);
    const isInstallment=installments>1;
    const installmentNumber=Number(p.installmentNumber||1);
    const title=isInstallment?`${Dom.esc(p.description)} <span class="pill">${installmentNumber}/${installments}</span>`:Dom.esc(p.description);
    const total=isInstallment?` • Total da compra ${Dom.money(p.totalValue||p.value)}`:'';
    const secondary=!p.billId?Components.actions([Components.mini('Editar','editCardPurchase',p.id)],[Components.mini(isInstallment?'Excluir compra parcelada':'Excluir','deleteCardPurchase',p.id,'danger')]):'<div class="meta">Parcela já fechada em fatura.</div>';
    return `<div class="item compact-item ${p.billId?'success-accent':''}"><h4>${title}</h4><div class="meta">${Dom.money(p.value)} • ${Dom.esc(p.category)} • Compra em ${Dom.date(p.date)} • Fatura ${Dom.esc(p.invoiceMonth)}${total} • ${p.billId?'Fechada':'Aberta'}</div>${secondary}</div>`;
  }
  function newCardPurchaseForm(cardId){
    const data=StorageService.read();
    PlanningEngine.ensure(data);
    const c=cardById(data,cardId);
    if(!c)return;
    Dom.openSheet(Components.sheet('Nova compra no cartão',Components.card(c.name,`Limite disponível: <b>${Dom.money(PlanningEngine.cardAvailableLimit(data,cardId))}</b><br>Se informar mais de 1 parcela, cada parcela será enviada para uma fatura mensal diferente.`)+Components.field('purchaseDesc','Descrição')+Components.field('purchaseValue','Valor total da compra','text')+Components.select('purchaseCategory','Categoria',data.categories.map(x=>x.name),'Geral')+Components.field('purchaseDate','Data da compra','date',Models.today())+Components.field('purchaseInstallments','Quantidade de parcelas','number','1')+Components.field('purchaseInvoice','Primeira fatura','month',PlanningEngine.invoiceMonthFor(c,Models.today())),`saveCardPurchase:${cardId}`));
  }
  function saveCardPurchase(cardId){
    let created=null;
    StorageService.update(d=>{created=PlanningEngine.addCardPurchase(d,{cardId,description:Dom.$('#purchaseDesc').value,value:moneyValue('purchaseValue'),category:Dom.$('#purchaseCategory').value,date:Dom.$('#purchaseDate').value||Models.today(),installments:Dom.$('#purchaseInstallments').value,invoiceMonth:Dom.$('#purchaseInvoice').value||monthNow()});});
    Dom.closeSheet();
    openCard(cardId);
    Dom.toast(Array.isArray(created)?'Compra parcelada registrada em faturas futuras.':'Compra registrada no cartão.');
  }
  function editCardPurchaseForm(id){
    const data=StorageService.read();
    PlanningEngine.ensure(data);
    const p=purchaseById(data,id);
    if(!p)return;
    const isInstallment=Number(p.installments||1)>1;
    Dom.openSheet(Components.sheet('Editar compra',Components.card(isInstallment?'Parcela de compra parcelada':'Compra aberta',isInstallment?'Valor e parcelamento não são editados isoladamente. Para mudar, exclua a compra parcelada aberta e cadastre novamente.':'Compra aberta pode ter valor ajustado antes do fechamento da fatura.')+Components.field('editPurchaseDesc','Descrição','text',p.description)+(isInstallment?'':Components.field('editPurchaseValue','Valor','text',Dom.money(p.value)))+Components.select('editPurchaseCategory','Categoria',data.categories.map(x=>x.name),p.category)+Components.field('editPurchaseDate','Data','date',p.date)+Components.field('editPurchaseInvoice','Fatura','month',p.invoiceMonth),`saveEditCardPurchase:${id}`));
  }
  function saveEditCardPurchase(id){
    let cardId=null;
    StorageService.update(d=>{const p=purchaseById(d,id);cardId=p&&p.cardId;const input={description:Dom.$('#editPurchaseDesc').value,category:Dom.$('#editPurchaseCategory').value,date:Dom.$('#editPurchaseDate').value,invoiceMonth:Dom.$('#editPurchaseInvoice').value};if(Dom.$('#editPurchaseValue'))input.value=moneyValue('editPurchaseValue');PlanningEngine.updateCardPurchase(d,id,input);});
    Dom.closeSheet();
    if(cardId)openCard(cardId);
    Dom.toast('Compra atualizada.');
  }
  function deleteCardPurchase(id){
    let cardId=null;
    if(!confirm('Excluir compra do cartão? Em compra parcelada aberta, todas as parcelas abertas dessa compra serão removidas.'))return;
    StorageService.update(d=>{const p=purchaseById(d,id);cardId=p&&p.cardId;PlanningEngine.deleteCardPurchase(d,id);});
    if(cardId)openCard(cardId);
    Dom.toast('Compra excluída.');
  }
  function closeCardInvoiceForm(cardId){
    const data=StorageService.read();
    const c=cardById(data,cardId);
    if(!c)return;
    Dom.openSheet(Components.sheet('Fechar fatura',Components.card(c.name,'Ao fechar, somente as compras/parcelas abertas da fatura escolhida viram uma conta a pagar na aba Finanças.')+Components.field('invoiceMonth','Fatura','month',monthNow())+Components.field('invoiceDue','Vencimento','date',PlanningEngine.invoiceDueDate(c,monthNow())),`saveCloseCardInvoice:${cardId}`));
  }
  function saveCloseCardInvoice(cardId){
    StorageService.update(d=>PlanningEngine.closeCardInvoice(d,cardId,Dom.$('#invoiceMonth').value||monthNow(),Dom.$('#invoiceDue').value||null));
    Dom.closeSheet();
    openCard(cardId);
    Dom.toast('Fatura fechada e conta a pagar criada.');
  }
  function install(){
    if(!window.PlanningUI)return;
    PlanningUI.showCards=showCards;
    PlanningUI.openCard=openCard;
    PlanningUI.newCardPurchaseForm=newCardPurchaseForm;
    PlanningUI.saveCardPurchase=saveCardPurchase;
    PlanningUI.editCardPurchaseForm=editCardPurchaseForm;
    PlanningUI.saveEditCardPurchase=saveEditCardPurchase;
    PlanningUI.deleteCardPurchase=deleteCardPurchase;
    PlanningUI.closeCardInvoiceForm=closeCardInvoiceForm;
    PlanningUI.saveCloseCardInvoice=saveCloseCardInvoice;
  }
  setTimeout(install,0);
  return {install,showCards,openCard};
})();
