window.MoneyMask=(function(){
  const moneyWords=/valor|saldo|pagamento|pago|paga|recebido|receber|despesa|receita|previsto|inicial|mínimo|minimo|redução|reducao|desconto|acréscimo|acrescimo|limite|total/i;

  function onlyDigits(value){return String(value||'').replace(/\D/g,'');}
  function centsToNumber(digits){return Number(onlyDigits(digits)||0)/100;}
  function format(value){
    const number=typeof value==='number'?value:centsToNumber(value);
    return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(number);
  }
  function parse(value){
    const text=String(value||'').trim();
    if(!text)return 0;
    const negative=/^-|\(.*\)/.test(text);
    const digits=onlyDigits(text);
    const number=Number(digits||0)/100;
    return negative?-number:number;
  }
  function labelOf(input){
    const field=input.closest('.field');
    const span=field?field.querySelector('span'):null;
    return span?span.textContent:'';
  }
  function shouldMask(input){
    if(!input||input.dataset.moneyMask==='1')return false;
    if(input.type==='date'||input.type==='time'||input.type==='checkbox')return false;
    const label=labelOf(input);
    const id=input.id||'';
    const placeholder=input.placeholder||'';
    return moneyWords.test(`${label} ${id} ${placeholder}`);
  }
  function enhance(input){
    if(!shouldMask(input))return;
    input.dataset.moneyMask='1';
    input.type='text';
    input.inputMode='numeric';
    input.autocomplete='off';
    input.placeholder='R$ 0,00';
    input.setAttribute('aria-label',(labelOf(input)||'Valor')+' em reais');

    const initial=parse(input.value);
    input.value=format(initial);

    input.addEventListener('input',function(){
      const digits=onlyDigits(input.value);
      input.value=format(digits);
      try{input.setSelectionRange(input.value.length,input.value.length);}catch(e){}
    });
    input.addEventListener('focus',function(){
      try{input.setSelectionRange(input.value.length,input.value.length);}catch(e){}
    });
  }
  function enhanceAll(root){
    (root||document).querySelectorAll('input').forEach(enhance);
  }

  const oldOpenSheet=window.Dom&&window.Dom.openSheet;
  if(oldOpenSheet){
    window.Dom.openSheet=function(html){
      oldOpenSheet(html);
      setTimeout(()=>enhanceAll(document.getElementById('sheet')),30);
    };
  }

  new MutationObserver(()=>setTimeout(()=>enhanceAll(),20)).observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>enhanceAll(),80);

  return {format,parse,enhanceAll};
})();
