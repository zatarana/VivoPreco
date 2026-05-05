window.StorageService=(function(){
  const KEY='vivopreco_clean_v1';
  function seed(){return {version:1,preferences:{defaultWalletId:'wallet_main'},wallets:[Models.wallet()],transactions:[Models.transaction({type:'receita',value:1500,description:'Entrada inicial',category:'Receita'})],bills:[],debts:[],categories:[{id:'cat_food',name:'Alimentação',type:'despesa'},{id:'cat_home',name:'Moradia',type:'despesa'},{id:'cat_debt',name:'Dívidas',type:'despesa'},{id:'cat_income',name:'Receita',type:'receita'},{id:'cat_general',name:'Geral',type:'ambos'}],budgets:[],goals:[],cards:[],timeLogs:[],activeTimer:null,projects:[{id:'project_inbox',name:'Inbox',color:'#2563eb',sections:['Entrada'],view:'list',kind:'comum',weeklyTargetMinutes:0},{id:'project_personal',name:'Pessoal',color:'#16a34a',sections:['Geral','Rotina'],view:'list',kind:'comum',weeklyTargetMinutes:0},{id:'project_finance',name:'Finanças',color:'#d97706',sections:['A Fazer','Em andamento','Concluído'],view:'board',kind:'comum',weeklyTargetMinutes:0},{id:'project_study',name:'Estudos',color:'#7c3aed',sections:['Matérias','Questões','Revisão'],view:'list',kind:'estudos',weeklyTargetMinutes:1200}],tasks:[Models.task({title:'Revisar orçamento do mês',projectId:'project_finance',section:'A Fazer',dueDate:Models.today(),priority:'P1',labels:['finanças']}),Models.task({title:'Estudar Direito Constitucional',projectId:'project_study',section:'Matérias',dueDate:Models.today(),priority:'P1',labels:['estudos'],recurrence:'diaria',seriesId:'series_direito_constitucional',estimatedMinutes:50})]};}
  function normalize(data){
    data.version=data.version||1;
    data.wallets=Array.isArray(data.wallets)&&data.wallets.length?data.wallets:[Models.wallet()];
    if(!data.wallets.find(w=>w.id==='wallet_main'))data.wallets.unshift(Models.wallet());
    data.preferences=data.preferences||{};
    if(!data.preferences.defaultWalletId||!data.wallets.find(w=>w.id===data.preferences.defaultWalletId))data.preferences.defaultWalletId=data.wallets[0].id;
    data.transactions=Array.isArray(data.transactions)?data.transactions:[];
    data.bills=Array.isArray(data.bills)?data.bills:[];
    data.debts=Array.isArray(data.debts)?data.debts:[];
    data.categories=Array.isArray(data.categories)?data.categories:seed().categories;
    data.budgets=Array.isArray(data.budgets)?data.budgets:[];
    data.goals=Array.isArray(data.goals)?data.goals:[];
    data.cards=Array.isArray(data.cards)?data.cards:[];
    data.timeLogs=Array.isArray(data.timeLogs)?data.timeLogs:[];
    data.activeTimer=data.activeTimer||null;
    data.projects=Array.isArray(data.projects)?data.projects:[];
    data.projects=data.projects.map(p=>Object.assign({kind:'comum',weeklyTargetMinutes:0},p));
    data.tasks=Array.isArray(data.tasks)?data.tasks:[];
    data.tasks=data.tasks.map(t=>Object.assign({recurrence:'nenhuma',seriesId:null,estimatedMinutes:0},t));
    return data;
  }
  function read(){try{const raw=localStorage.getItem(KEY);return raw?normalize(JSON.parse(raw)):write(seed());}catch(e){console.error(e);return write(seed());}}
  function write(data){const normalized=normalize(data);localStorage.setItem(KEY,JSON.stringify(normalized));return normalized;}
  function update(mutator){const data=read();mutator(data);write(data);return data;}
  function reset(){return write(seed());}
  return {read,write,update,reset,KEY};
})();
