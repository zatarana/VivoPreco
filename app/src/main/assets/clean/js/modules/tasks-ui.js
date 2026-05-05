window.TasksUI=(function(){
  function render(data){
    Dom.setHeader('Tarefas','Projetos e tarefas sem misturar regra com interface.');
    const tasks=TaskEngine.today(data);
    Dom.render(`<div class="grid">${Components.metric('Hoje',String(tasks.length),'primary')}${Components.metric('Abertas',String(TaskEngine.openTasks(data).length),'primary')}${Components.metric('Concluídas',String(TaskEngine.completedTasks(data).length),'success')}${Components.metric('Projetos',String(TaskEngine.projects(data).length),'warning')}</div>${Components.button('+ Nova tarefa','newTask')}${Components.button('+ Novo projeto','newProject','secondary')}<h2 class="section">Hoje</h2>${taskList(data,tasks)}<h2 class="section">Projetos</h2>${projectList(data)}`);
  }
  function taskList(data,tasks){return tasks.length?`<div class="list">${tasks.map(t=>`<div class="item task-accent ${t.done?'task-done':''}"><div class="row"><button class="task-check" data-action="completeTask" data-id="${t.id}">${t.done?'✓':''}</button><div><h4>${Dom.esc(t.title)}</h4><div class="meta">${Dom.esc(projectName(data,t.projectId))} • ${Dom.date(t.dueDate)} • ${Dom.esc(t.priority)} ${t.labels.map(l=>`<span class="pill">#${Dom.esc(l)}</span>`).join('')}</div></div></div></div>`).join('')}</div>`:Components.empty('Nenhuma tarefa para hoje.');}
  function projectList(data){return data.projects.map(p=>`<div class="item"><h4>${Dom.esc(p.name)}</h4><div class="meta">${TaskEngine.byProject(data,p.id).length} tarefa(s) abertas • ${Dom.esc(p.view)}</div></div>`).join('');}
  function projectName(data,id){return (data.projects.find(p=>p.id===id)||{}).name||'Projeto';}
  function newTaskForm(){const data=StorageService.read();Dom.openSheet(Components.sheet('Nova tarefa',Components.field('taskTitle','Título')+Components.select('taskProject','Projeto',data.projects.map(p=>p.name),data.projects[0].name)+Components.field('taskDue','Data','date',Models.today())+Components.select('taskPriority','Prioridade',['P1','P2','P3','P4'],'P4')+Components.field('taskLabels','Etiquetas'), 'saveTask'));}
  function saveTask(){StorageService.update(d=>{const project=d.projects.find(p=>p.name===Dom.$('#taskProject').value)||d.projects[0];TaskEngine.addTask(d,{title:Dom.$('#taskTitle').value||'Nova tarefa',projectId:project.id,dueDate:Dom.$('#taskDue').value||null,priority:Dom.$('#taskPriority').value,labels:Dom.$('#taskLabels').value.split(',').map(x=>x.trim()).filter(Boolean)});});Dom.closeSheet();App.render();Dom.toast('Tarefa criada.');}
  function newProjectForm(){Dom.openSheet(Components.sheet('Novo projeto',Components.field('projectName','Nome')+Components.select('projectView','Visualização',['list','board'],'list'), 'saveProject'));}
  function saveProject(){StorageService.update(d=>TaskEngine.addProject(d,{name:Dom.$('#projectName').value||'Projeto',view:Dom.$('#projectView').value}));Dom.closeSheet();App.render();Dom.toast('Projeto criado.');}
  function completeTask(id){StorageService.update(d=>TaskEngine.complete(d,id));App.render();Dom.toast('Tarefa concluída.');}
  return {render,newTaskForm,saveTask,newProjectForm,saveProject,completeTask};
})();
