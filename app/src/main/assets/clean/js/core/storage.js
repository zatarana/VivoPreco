window.StorageService=(function(){
  const KEY='vivopreco_clean_v1';
  const ACCOUNT_TYPES=['corrente','poupança','investimento','carteira'];
  function normalizeAccountType(type){
    const raw=String(type||'corrente').trim().toLowerCase();
    if(['conta corrente','corrente','cc'].includes(raw))return 'corrente';
    if(['poupanca','poupança','cp'].includes(raw))return 'poupança';
    if(['investimento','investimentos'].includes(raw))return 'investimento';
    if(['carteira','wallet','dinheiro'].includes(raw))return 'carteira';
    return ACCOUNT_TYPES.includes(raw)?raw:'corrente';
  }
  function hasNative(){return !!(window.VivoStorage&&typeof window.VivoStorage.getItem==='function');}
  function nativeGet(key){try{return hasNative()?window.VivoStorage.getItem(key):null;}catch(e){console.warn('Native get falhou',e);return null;}}
  function nativeSet(key,value){try{if(hasNative())window.VivoStorage.setItem(key,value);}catch(e){console.warn('Native set falhou',e);}}
  function nativeRemove(key){try{if(hasNative())window.VivoStorage.removeItem(key);}catch(e){console.warn('Native remove falhou',e);}}
  function seed(){return {version:1,preferences:{defaultWalletId:'wallet_main'},wallets:[Models.wallet({type:'corrente',initialBalance:0})],transactions:[Models.transaction({type:'receita',value:1500,description:'Entrada inicial',category:'Receita'})],bills:[],debts:[],categories:[{id:'cat_food',name:'Alimentação',type:'despesa'},{id:'cat_home',name:'Moradia',type:'despesa'},{id:'cat_debt',name:'Dívidas',type:'despesa'},{id:'cat_income',name:'Receita',type:'receita'},{id:'cat_general',name:'Geral',type:'ambos'},{id:'cat_card',name:'Cartão',type:'despesa'}],budgets:[],goals:[],cards:[],cardPurchases:[],timeLogs:[],activeTimer:null,projects:[{id:'project_inbox',name:'Inbox',color:'#2563eb',sections:['Entrada'],view:'list',kind:'comum',weeklyTargetMinutes:0},{id:'project_personal',name:'Pessoal',color:'#16a34a',sections:['Geral','Rotina'],view:'list',kind:'comum',weeklyTargetMinutes:0},{id:'project_finance',name:'Finanças',color:'#d97706',sections:['A Fazer','Em andamento','Concluído'],view:'board',kind:'comum',weeklyTargetMinutes:0},{id:'project_study',name:'Estudos',color:'#7c3aed',sections:['Matérias','Questões','Revisão'],view:'list',kind:'estudos',weeklyTargetMinutes:1200}],tasks:[Models.task({title:'Revisar orçamento do mês',projectId:'project_finance',section:'A Fazer',dueDate:Models.today(),priority:'P1',labels:['finanças']}),Models.task({title:'Estudar Direito Constitucional',projectId:'project_study',section:'Matérias',dueDate:Models.today(),priority:'P1',labels:['estudos'],recurrence:'diaria',seriesId:'series_direito_constitucional',estimatedMinutes:50})]};}
  function normalize(data){
    data.version=data.version||1;
    data.wallets=Array.isArray(data.wallets)&&data.wallets.length?data.wallets:[Models.wallet()];
    if(!data.wallets.find(w=>w.id==='wallet_main'))data.wallets.unshift(Models.wallet());
    data.wallets=data.wallets.map(w=>Object.assign({},w,{type:normalizeAccountType(w.type),initialBalance:Number(w.initialBalance||0)}));
    data.preferences=data.preferences||{};
    if(!data.preferences.defaultWalletId||!data.wallets.find(w=>w.id===data.preferences.defaultWalletId))data.preferences.defaultWalletId=data.wallets[0].id;
    data.transactions=Array.isArray(data.transactions)?data.transactions:[];
    data.bills=Array.isArray(data.bills)?data.bills:[];
    data.debts=Array.isArray(data.debts)?data.debts:[];
    data.categories=Array.isArray(data.categories)?data.categories:seed().categories;
    if(!data.categories.some(c=>c.name==='Cartão'))data.categories.push({id:'cat_card',name:'Cartão',type:'despesa'});
    data.budgets=Array.isArray(data.budgets)?data.budgets:[];
    data.goals=Array.isArray(data.goals)?data.goals:[];
    data.cards=Array.isArray(data.cards)?data.cards:[];
    data.cards=data.cards.map(c=>Object.assign({active:true},c));
    data.cardPurchases=Array.isArray(data.cardPurchases)?data.cardPurchases:[];
    data.cardPurchases=data.cardPurchases.map(p=>Object.assign({installments:1,billId:null,invoiceMonth:String(p.date||Models.today()).slice(0,7)},p));
    data.timeLogs=Array.isArray(data.timeLogs)?data.timeLogs:[];
    data.activeTimer=data.activeTimer||null;
    data.projects=Array.isArray(data.projects)?data.projects:[];
    data.projects=data.projects.map(p=>Object.assign({kind:'comum',weeklyTargetMinutes:0},p));
    data.tasks=Array.isArray(data.tasks)?data.tasks:[];
    data.tasks=data.tasks.map(t=>Object.assign({recurrence:'nenhuma',seriesId:null,estimatedMinutes:0},t));
    return data;
  }
  function read(){try{const nativeRaw=nativeGet(KEY);const localRaw=localStorage.getItem(KEY);const raw=nativeRaw||localRaw;if(raw){if(nativeRaw&&!localRaw)localStorage.setItem(KEY,nativeRaw);if(localRaw&&!nativeRaw)nativeSet(KEY,localRaw);return normalize(JSON.parse(raw));}return write(seed());}catch(e){console.error(e);return write(seed());}}
  function write(data){const normalized=normalize(data);const raw=JSON.stringify(normalized);localStorage.setItem(KEY,raw);nativeSet(KEY,raw);return normalized;}
  function update(mutator){const data=read();mutator(data);write(data);return data;}
  function reset(){nativeRemove(KEY);return write(seed());}
  return {read,write,update,reset,KEY,hasNative,ACCOUNT_TYPES,normalizeAccountType};
})();
