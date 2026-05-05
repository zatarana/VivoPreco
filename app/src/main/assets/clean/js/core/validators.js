window.Validators=(function(){
  function required(value,label){if(value===undefined||value===null||String(value).trim()==='')throw new Error(`${label} é obrigatório.`);return value;}
  function positiveNumber(value,label){const n=Number(value);if(!Number.isFinite(n)||n<=0)throw new Error(`${label} deve ser maior que zero.`);return n;}
  function nonNegativeNumber(value,label){const n=Number(value);if(!Number.isFinite(n)||n<0)throw new Error(`${label} não pode ser negativo.`);return n;}
  function oneOf(value,allowed,label){if(!allowed.includes(value))throw new Error(`${label} inválido.`);return value;}
  function isoDate(value,label){if(!value)return value;if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error(`${label} deve estar no formato AAAA-MM-DD.`);return value;}
  function normalizeMoney(value){return Number(String(value||'0').replace('R$','').replace(/\./g,'').replace(',','.'))||0;}
  function safeText(value,max){return String(value||'').trim().slice(0,max||120);}
  return {required,positiveNumber,nonNegativeNumber,oneOf,isoDate,normalizeMoney,safeText};
})();
