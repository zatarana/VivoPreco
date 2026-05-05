window.TaskEngine=(function(){
  function tasks(data){return data.tasks||[];}
  function projects(data){return data.projects||[];}
  function openTasks(data){return tasks(data).filter(t=>!t.done);}
  function completedTasks(data){return tasks(data).filter(t=>t.done);}
  function addTask(data,input){const t=Models.task(input);data.tasks.push(t);return t;}
  function addProject(data,input){const p=Models.project(input);data.projects.push(p);return p;}
  function complete(data,taskId){const t=tasks(data).find(x=>x.id===taskId);if(!t)throw new Error('Tarefa não encontrada');t.done=true;t.status='Concluída';t.completedAt=Models.today();return t;}
  function reopen(data,taskId){const t=tasks(data).find(x=>x.id===taskId);if(!t)throw new Error('Tarefa não encontrada');t.done=false;t.status='A Fazer';t.completedAt=null;return t;}
  function today(data){return openTasks(data).filter(t=>!t.dueDate||t.dueDate===Models.today()).sort(sortTask);}
  function upcoming(data){return openTasks(data).filter(t=>t.dueDate&&t.dueDate>=Models.today()).sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate))||sortTask(a,b));}
  function byProject(data,projectId){return openTasks(data).filter(t=>t.projectId===projectId).sort(sortTask);}
  function sortTask(a,b){const p={P1:1,P2:2,P3:3,P4:4};return (p[a.priority]||4)-(p[b.priority]||4)||String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999'));}
  return {tasks,projects,openTasks,completedTasks,addTask,addProject,complete,reopen,today,upcoming,byProject};
})();
