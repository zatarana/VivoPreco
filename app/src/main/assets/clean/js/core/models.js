window.Models=(function(){
  function uid(prefix){return `${prefix}_${Date.now()}_${Math.round(Math.random()*100000)}`;}
  function today(){return new Date().toISOString().slice(0,10);}
  function now(){return new Date().toISOString();}
  function transaction(data){return Object.assign({id:uid('tx'),type:'despesa',value:0,description:'',category:'Geral',walletId:'wallet_main',date:today(),billId:null,debtId:null,createdAt:today()},data||{});}
  function wallet(data){return Object.assign({id:'wallet_main',name:'Principal',type:'corrente',initialBalance:0,includeInTotal:true},data||{});}
  function bill(data){return Object.assign({id:uid('bill'),name:'Conta',flow:'A_PAGAR',expected:0,settled:0,finalValue:0,dueDate:today(),category:'Geral',walletId:'wallet_main',status:'PENDENTE',debtId:null,createdAt:today()},data||{});}
  function debt(data){return Object.assign({id:uid('debt'),name:'Dívida',creditor:'Não informado',kind:'Outro',original:0,balance:0,paid:0,interestKnown:false,interestRate:null,status:'Em aberto',minPayment:0,dueDate:today(),events:[]},data||{});}
  function project(data){return Object.assign({id:uid('project'),name:'Inbox',color:'#2563eb',sections:['Entrada'],view:'list',kind:'comum',weeklyTargetMinutes:0},data||{});}
  function task(data){return Object.assign({id:uid('task'),title:'Nova tarefa',description:'',projectId:'project_inbox',section:'Entrada',dueDate:null,priority:'P4',labels:[],status:'A Fazer',done:false,parentId:null,comments:[],recurrence:'nenhuma',seriesId:null,estimatedMinutes:0,createdAt:today(),completedAt:null},data||{});}
  function timeLog(data){return Object.assign({id:uid('time'),taskId:null,projectId:null,seriesId:null,date:today(),durationMinutes:0,mode:'manual',note:'',createdAt:now()},data||{});}
  return {uid,today,now,transaction,wallet,bill,debt,project,task,timeLog};
})();
