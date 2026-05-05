window.StorageService=(function(){
  const KEY='vivopreco_clean_v1';
  function seed(){return {version:1,wallets:[Models.wallet()],transactions:[Models.transaction({type:'receita',value:1500,description:'Entrada inicial',category:'Receita'})],bills:[],debts:[],projects:[{id:'project_inbox',name:'Inbox',color:'#2563eb',sections:['Entrada'],view:'list'},{id:'project_personal',name:'Pessoal',color:'#16a34a',sections:['Geral','Rotina'],view:'list'},{id:'project_finance',name:'Finanças',color:'#d97706',sections:['A Fazer','Em andamento','Concluído'],view:'board'}],tasks:[Models.task({title:'Revisar orçamento do mês',projectId:'project_finance',section:'A Fazer',dueDate:Models.today(),priority:'P1',labels:['finanças']})]};}
  function read(){try{const raw=localStorage.getItem(KEY);return raw?JSON.parse(raw):write(seed());}catch(e){console.error(e);return write(seed());}}
  function write(data){localStorage.setItem(KEY,JSON.stringify(data));return data;}
  function update(mutator){const data=read();mutator(data);write(data);return data;}
  function reset(){return write(seed());}
  return {read,write,update,reset,KEY};
})();
