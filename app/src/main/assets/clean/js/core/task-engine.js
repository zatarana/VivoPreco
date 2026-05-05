window.TaskEngine=(function(){
  function tasks(data){return data.tasks||[];}
  function projects(data){return data.projects||[];}
  function openTasks(data){return tasks(data).filter(t=>!t.done);}
  function completedTasks(data){return tasks(data).filter(t=>t.done);}
  function addTask(data,input){const t=Models.task(input);Validators.required(t.title,'Título da tarefa');if(!projects(data).find(p=>p.id===t.projectId))throw new Error('Projeto da tarefa não encontrado.');data.tasks.push(t);return t;}
  function updateTask(data,taskId,input){const t=tasks(data).find(x=>x.id===taskId);if(!t)throw new Error('Tarefa não encontrada');if(input.title!==undefined)t.title=Validators.safeText(input.title||t.title,160);if(input.description!==undefined)t.description=Validators.safeText(input.description,500);if(input.projectId!==undefined){if(!projects(data).find(p=>p.id===input.projectId))throw new Error('Projeto não encontrado');t.projectId=input.projectId;}if(input.section!==undefined)t.section=Validators.safeText(input.section||'Entrada',80);if(input.dueDate!==undefined)t.dueDate=input.dueDate||null;if(input.priority!==undefined)t.priority=Validators.oneOf(input.priority,['P1','P2','P3','P4'],'Prioridade');if(input.labels!==undefined)t.labels=Array.isArray(input.labels)?input.labels:[];if(input.status!==undefined)t.status=input.status;return t;}
  function deleteTask(data,taskId){const idx=tasks(data).findIndex(t=>t.id===taskId);if(idx<0)throw new Error('Tarefa não encontrada');const removed=tasks(data)[idx];data.tasks=data.tasks.filter(t=>t.id!==taskId&&t.parentId!==taskId);return removed;}
  function addProject(data,input){const p=Models.project(input);Validators.required(p.name,'Nome do projeto');data.projects.push(p);return p;}
  function complete(data,taskId){const t=tasks(data).find(x=>x.id===taskId);if(!t)throw new Error('Tarefa não encontrada');t.done=true;t.status='Concluída';t.completedAt=Models.today();return t;}
  function reopen(data,taskId){const t=tasks(data).find(x=>x.id===taskId);if(!t)throw new Error('Tarefa não encontrada');t.done=false;t.status='A Fazer';t.completedAt=null;return t;}
  function addComment(data,taskId,text){const t=tasks(data).find(x=>x.id===taskId);if(!t)throw new Error('Tarefa não encontrada');t.comments=Array.isArray(t.comments)?t.comments:[];t.comments.push({id:Models.uid('comment'),date:Models.today(),text:Validators.safeText(text,500)});return t;}
  function addSubtask(data,parentId,input){const parent=tasks(data).find(x=>x.id===parentId);if(!parent)throw new Error('Tarefa principal não encontrada');return addTask(data,Object.assign({projectId:parent.projectId,section:parent.section,parentId:parent.id,priority:parent.priority,labels:parent.labels},input));}
  function today(data){return openTasks(data).filter(t=>!t.dueDate||t.dueDate===Models.today()).sort(sortTask);}
  function upcoming(data){return openTasks(data).filter(t=>t.dueDate&&t.dueDate>=Models.today()).sort((a,b)=>String(a.dueDate).localeCompare(String(b.dueDate))||sortTask(a,b));}
  function overdue(data){return openTasks(data).filter(t=>t.dueDate&&t.dueDate<Models.today()).sort(sortTask);}
  function byProject(data,projectId){return openTasks(data).filter(t=>t.projectId===projectId&&!t.parentId).sort(sortTask);}
  function subtasks(data,parentId){return tasks(data).filter(t=>t.parentId===parentId).sort(sortTask);}
  function labels(data){return [...new Set(tasks(data).flatMap(t=>t.labels||[]))].sort();}
  function byLabel(data,label){return openTasks(data).filter(t=>(t.labels||[]).includes(label)).sort(sortTask);}
  function sortTask(a,b){const p={P1:1,P2:2,P3:3,P4:4};return (p[a.priority]||4)-(p[b.priority]||4)||String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999'));}
  return {tasks,projects,openTasks,completedTasks,addTask,updateTask,deleteTask,addProject,complete,reopen,addComment,addSubtask,today,upcoming,overdue,byProject,subtasks,labels,byLabel};
})();
