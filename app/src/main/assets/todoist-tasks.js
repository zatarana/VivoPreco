// Módulo de tarefas/projetos inspirado em padrões do Todoist.
// Mantém o que já existia, adicionando projetos, seções, subtarefas, etiquetas, filtros, board, calendário e produtividade.

(function(){
  function id(){ return Date.now()+Math.round(Math.random()*9999); }
  function todayIso(){ return new Date().toISOString().slice(0,10); }
  function addDays(n){ const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
  function fmtDate(iso){ if(!iso||iso==='Sem data')return 'Sem data'; const p=String(iso).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:iso; }
  function tData(){ return db.get('tasks',[]).map(normalizeTask); }
  function saveTasks(a){ db.set('tasks',a.map(normalizeTask)); }
  function pData(){ let p=db.get('projects',[]); if(!p.length){ p=[{id:'inbox',name:'Inbox',color:'#e44332',favorite:true,view:'list',sections:['Entrada']},{id:'personal',name:'Pessoal',color:'#246fe0',favorite:true,view:'list',sections:['Geral','Rotina']},{id:'finance',name:'Finanças',color:'#16a34a',favorite:true,view:'board',sections:['A Fazer','Em andamento','Concluído']}]; db.set('projects',p); } return p; }
  function saveProjects(p){ db.set('projects',p); }

  function normalizeTask(t){
    const projectName=t.project||t.list||'Inbox';
    const proj=projectFromName(projectName)||projectFromId(t.projectId)||pData()[0];
    return {
      id:t.id||id(),
      title:t.title||t.t||'Nova tarefa',
      desc:t.desc||t.description||'',
      projectId:t.projectId||proj.id,
      section:t.section||t.status||'Entrada',
      due:normalizeDue(t.due),
      priority:t.priority||normalizePriority(t.prio),
      labels:Array.isArray(t.labels)?t.labels:parseLabels(t.tag),
      status:t.done?'Concluída':(t.status||'A Fazer'),
      done:!!t.done,
      recurrence:t.recurrence||'Nenhuma',
      estimate:t.estimate||t.est||'',
      parentId:t.parentId||null,
      comments:Array.isArray(t.comments)?t.comments:[],
      createdAt:t.createdAt||todayIso(),
      completedAt:t.completedAt||null
    };
  }
  function projectFromName(name){ return pData().find(p=>p.name===name||p.id===name); }
  function projectFromId(pid){ return pData().find(p=>p.id===pid); }
  function normalizePriority(p){ if(['P1','P2','P3','P4'].includes(p))return p; if(p==='Alta')return 'P1'; if(p==='Média')return 'P2'; if(p==='Baixa')return 'P3'; return 'P4'; }
  function parseLabels(tag){ if(!tag)return []; return String(tag).split(/[ ,]+/).filter(Boolean).map(x=>x.replace(/^#/,'')); }
  function normalizeDue(d){ if(!d||d==='Sem data')return 'Sem data'; if(d==='Hoje')return todayIso(); if(d==='Amanhã')return addDays(1); return d; }
  function projectName(pid){ const p=projectFromId(pid); return p?p.name:'Inbox'; }
  function priorityClass(p){ return p==='P1'?'todo-p1':p==='P2'?'todo-p2':p==='P3'?'todo-p3':'todo-p4'; }
  function openTasks(){ return tData().filter(t=>!t.done); }
  function completedTasks(){ return tData().filter(t=>t.done); }
  function isToday(d){ return d===todayIso(); }
  function isUpcoming(d){ return d!=='Sem data'&&d>=todayIso(); }

  saveTasks(tData());
  pData();

  function todoShell(title,subtitle,inner,active){
    app.innerHTML=`<div class="todo-page"><section class="todo-hero"><div class="todo-top"><div class="todo-brand"><span class="todo-logo">✓</span><span>Vivo Tasks</span></div><button class="todo-chip red" data-todo-act="quickTask">＋ Tarefa</button></div><div class="todo-title">${esc(title)}</div><p class="todo-sub">${esc(subtitle)}</p><div class="todo-search"><input id="todoSearchInput" placeholder="Buscar tarefa, projeto, etiqueta..."><button data-todo-view="todoSearch">Buscar</button></div></section><section class="todo-tabs">${tabs(active)}</section><section class="todo-section">${quickCaptureHtml()}${inner}</section></div>`;
  }
  function tabs(active){
    const arr=[['today','Hoje'],['upcoming','Próximas'],['projects','Projetos'],['labels','Etiquetas'],['filters','Filtros'],['board','Board'],['calendar','Calendário'],['karma','Produtividade']];
    return arr.map(x=>`<button class="${active===x[0]?'on':''}" data-todo-view="${x[0]}">${x[1]}</button>`).join('');
  }
  function quickCaptureHtml(){
    return `<div class="todo-quick"><input id="quickTaskInput" placeholder="Adicionar tarefa rápida — ex: pagar boleto amanhã #finanças p1"><div class="todo-quick-row"><button class="todo-chip red" data-todo-act="saveQuickTask">Adicionar</button><span class="todo-chip">#etiquetas</span><span class="todo-chip">P1/P2/P3/P4</span><span class="todo-chip">hoje/amanhã</span></div></div>`;
  }

  window.prod=function(){ todoToday(); };

  function todoToday(){
    vpCurrentScreen='todoToday';
    head('Produtividade','Tarefas, projetos, etiquetas, filtros e planejamento.');
    const tasks=openTasks().filter(t=>isToday(t.due)||t.due==='Sem data').sort(taskSort);
    todoShell('Hoje','O que precisa da sua atenção agora.',todoStatsHtml()+taskListHtml(tasks,'Nenhuma tarefa para hoje.'),'today');
  }
  function todoUpcoming(){
    vpCurrentScreen='todoUpcoming';
    const tasks=openTasks().filter(t=>isUpcoming(t.due)).sort((a,b)=>String(a.due).localeCompare(String(b.due))||taskSort(a,b));
    todoShell('Próximas','Agenda futura organizada por data.',groupByDateHtml(tasks),'upcoming');
  }
  function todoProjects(){
    vpCurrentScreen='todoProjects';
    const projects=pData();
    const inner=`<div class="todo-layout"><div>${projectFormShortcut()}${projects.map(projectCard).join('')}</div><div>${projectDetailHtml(projects[0]?.id)}</div></div>`;
    todoShell('Projetos','Projetos coexistem com tarefas: cada tarefa pertence a um projeto e pode ter seção.',inner,'projects');
  }
  function projectFormShortcut(){ return `<button class="btn" data-todo-act="newProject">＋ Novo projeto</button>`; }
  function projectCard(p){
    const count=openTasks().filter(t=>t.projectId===p.id).length;
    return `<div class="todo-project" data-project-open="${p.id}" style="border-left-color:${p.color||'#e44332'}"><div class="todo-top"><h3>${esc(p.name)}</h3><span class="todo-count">${count}</span></div><p>${p.view==='board'?'Quadro':'Lista'} • ${p.sections.length} seção(ões)</p></div>`;
  }
  function projectDetailHtml(pid){
    const p=projectFromId(pid)||pData()[0]; if(!p)return '';
    const tasks=openTasks().filter(t=>t.projectId===p.id);
    return `<div class="todo-panel"><h3>${esc(p.name)}</h3><p>Seções: ${p.sections.map(esc).join(', ')}</p><div class="actions"><button class="mini primary" data-todo-project-task="${p.id}">Nova tarefa</button><button class="mini" data-todo-project-section="${p.id}">Nova seção</button></div></div>${p.view==='board'?boardHtml(tasks,p.sections):taskListHtml(tasks,'Sem tarefas neste projeto.')}`;
  }
  function todoLabels(){
    vpCurrentScreen='todoLabels';
    const labels=[...new Set(tData().flatMap(t=>t.labels||[]))];
    const inner=labels.length?labels.map(l=>`<div class="todo-project" data-label-open="${esc(l)}"><h3>#${esc(l)}</h3><p>${openTasks().filter(t=>t.labels.includes(l)).length} tarefa(s) abertas</p></div>`).join(''):emptyTodo('Nenhuma etiqueta ainda.');
    todoShell('Etiquetas','Organize por contexto: trabalho, casa, finanças, estudo.',inner,'labels');
  }
  function todoFilters(){
    vpCurrentScreen='todoFilters';
    const filters=[['Prioridade 1',openTasks().filter(t=>t.priority==='P1')],['Sem data',openTasks().filter(t=>t.due==='Sem data')],['Atrasadas',openTasks().filter(t=>t.due!=='Sem data'&&t.due<todayIso())],['Finanças',openTasks().filter(t=>t.labels.includes('finanças')||projectName(t.projectId)==='Finanças')],['Subtarefas',openTasks().filter(t=>t.parentId)]];
    const inner=filters.map(f=>`<div class="todo-panel"><div class="todo-top"><h3>${f[0]}</h3><span class="todo-count">${f[1].length}</span></div>${taskListHtml(f[1].slice(0,5),'Nenhuma tarefa neste filtro.')}</div>`).join('');
    todoShell('Filtros','Visões salvas para encontrar o que importa.',inner,'filters');
  }
  function todoBoard(){
    vpCurrentScreen='todoBoard';
    const tasks=openTasks();
    todoShell('Board','Arraste mentalmente o fluxo: A Fazer, Em andamento e Concluído.',boardHtml(tasks,['A Fazer','Em andamento','Concluída']),'board');
  }
  function todoCalendar(){
    vpCurrentScreen='todoCalendar';
    let days='';
    const tasks=openTasks();
    for(let i=0;i<31;i++){
      const iso=addDays(i), day=new Date(iso).getDate();
      const count=tasks.filter(t=>t.due===iso).length;
      days+=`<div class="todo-day ${i===0?'today':''} ${count?'has':''}">${day}${count?`<br>${count} tarefa(s)`:''}</div>`;
    }
    todoShell('Calendário','Visão mensal simples das tarefas com data.',`<div class="todo-calendar">${days}</div>`,'calendar');
  }
  function todoKarma(){
    vpCurrentScreen='todoKarma';
    const doneToday=completedTasks().filter(t=>t.completedAt===todayIso()).length;
    const totalDone=completedTasks().length;
    const open=openTasks().length;
    const p1=openTasks().filter(t=>t.priority==='P1').length;
    const score=totalDone*10+doneToday*15-p1*2;
    todoShell('Produtividade','Métricas leves inspiradas em produtividade diária.',`<div class="todo-karma"><div class="todo-karma-card"><small>Hoje</small><strong>${doneToday}</strong></div><div class="todo-karma-card"><small>Concluídas</small><strong>${totalDone}</strong></div><div class="todo-karma-card"><small>Abertas</small><strong>${open}</strong></div><div class="todo-karma-card"><small>Score</small><strong>${score}</strong></div></div>${todoStatsHtml()}`,'karma');
  }
  function todoSearch(){
    vpCurrentScreen='todoSearch';
    const q=(document.getElementById('todoSearchInput')?.value||'').toLowerCase();
    const tasks=tData().filter(t=>JSON.stringify(t).toLowerCase().includes(q));
    todoShell('Busca','Resultado local de tarefas, projetos e etiquetas.',taskListHtml(tasks,'Nada encontrado.'),'filters');
  }

  function todoStatsHtml(){
    const open=openTasks(), p1=open.filter(t=>t.priority==='P1').length, overdue=open.filter(t=>t.due!=='Sem data'&&t.due<todayIso()).length;
    return `<div class="todo-karma"><div class="todo-karma-card"><small>Abertas</small><strong>${open.length}</strong></div><div class="todo-karma-card"><small>P1</small><strong>${p1}</strong></div><div class="todo-karma-card"><small>Atrasadas</small><strong>${overdue}</strong></div><div class="todo-karma-card"><small>Projetos</small><strong>${pData().length}</strong></div></div>`;
  }
  function taskSort(a,b){ const pr={'P1':1,'P2':2,'P3':3,'P4':4}; return (pr[a.priority]||4)-(pr[b.priority]||4)||String(a.due).localeCompare(String(b.due)); }
  function groupByDateHtml(tasks){
    if(!tasks.length)return emptyTodo('Nenhuma tarefa futura.');
    const map={}; tasks.forEach(t=>(map[t.due]??=[]).push(t));
    return Object.keys(map).sort().map(d=>`<h2 class="section">${fmtDate(d)}</h2>${taskListHtml(map[d],'')}`).join('');
  }
  function taskListHtml(tasks,emptyText){
    if(!tasks.length)return emptyText?emptyTodo(emptyText):'';
    return `<div class="todo-list">${tasks.map(taskItemHtml).join('')}</div>`;
  }
  function taskItemHtml(t){
    const idx=tData().findIndex(x=>x.id===t.id);
    const subCount=tData().filter(x=>x.parentId===t.id).length;
    return `<div class="todo-task ${t.done?'done':''}"><button class="todo-check" data-todo-toggle="${idx}">${t.done?'✓':''}</button><div class="todo-main"><h4>${esc(t.title)}</h4><div class="todo-meta"><span><i class="todo-priority ${priorityClass(t.priority)}"></i>${t.priority}</span><span>${esc(projectName(t.projectId))}</span><span>${fmtDate(t.due)}</span>${t.labels.map(l=>`<span>#${esc(l)}</span>`).join('')}${subCount?`<span>${subCount} subtarefa(s)</span>`:''}</div>${t.desc?`<div class="todo-comment">${esc(t.desc)}</div>`:''}</div><div class="todo-actions"><button class="todo-small" data-todo-edit="${idx}">Editar</button><button class="todo-small" data-todo-sub="${idx}">Sub</button><button class="todo-small" data-todo-comment="${idx}">Com.</button></div></div>`;
  }
  function boardHtml(tasks,cols){
    return `<div class="todo-board">${cols.map(c=>`<div class="todo-column"><h3>${esc(c)}</h3>${tasks.filter(t=>(t.status||'A Fazer')===c|| (c==='Concluída'&&t.done)).map(t=>`<div class="todo-card" data-todo-cycle="${tData().findIndex(x=>x.id===t.id)}"><h4>${esc(t.title)}</h4><div class="todo-meta"><span>${t.priority}</span><span>${fmtDate(t.due)}</span></div></div>`).join('')||'<p class="meta">Sem tarefas.</p>'}</div>`).join('')}</div>`;
  }
  function emptyTodo(t){ return `<div class="todo-empty">${esc(t)}</div>`; }

  function quickParse(text){
    const labels=(text.match(/#[\p{L}0-9_-]+/gu)||[]).map(x=>x.slice(1));
    let priority='P4';
    const p=text.match(/\bp([1-4])\b/i); if(p)priority='P'+p[1];
    let due='Sem data';
    if(/amanh[aã]/i.test(text))due=addDays(1); else if(/hoje/i.test(text))due=todayIso();
    let title=text.replace(/#[\p{L}0-9_-]+/gu,'').replace(/\bp[1-4]\b/ig,'').replace(/amanh[aã]|hoje/ig,'').trim();
    return {title:title||'Nova tarefa',labels,priority,due};
  }
  function saveQuickTask(){
    const raw=document.getElementById('quickTaskInput')?.value||''; if(!raw.trim())return;
    const parsed=quickParse(raw), a=tData();
    a.push({id:id(),title:parsed.title,desc:'',projectId:'inbox',section:'Entrada',due:parsed.due,priority:parsed.priority,labels:parsed.labels,status:'A Fazer',done:false,recurrence:'Nenhuma',estimate:'',parentId:null,comments:[],createdAt:todayIso(),completedAt:null});
    saveTasks(a); todoToday();
  }
  function taskFormTodo(projectId){
    const ps=pData();
    form('Nova tarefa',[{id:'tdTitle',label:'Título'},{id:'tdDesc',label:'Descrição'},{id:'tdProject',label:'Projeto',options:ps.map(p=>p.name)},{id:'tdSection',label:'Seção/status',options:['Entrada','Geral','A Fazer','Em andamento','Concluída','Rotina']},{id:'tdDue',label:'Data',value:todayIso()},{id:'tdPriority',label:'Prioridade',options:['P1','P2','P3','P4']},{id:'tdLabels',label:'Etiquetas separadas por vírgula'},{id:'tdEstimate',label:'Estimativa',value:'30 min'}],'saveTodoTask');
    if(projectId){ setTimeout(()=>{ const p=projectFromId(projectId); const el=document.getElementById('tdProject'); if(p&&el)el.value=p.name; },50); }
  }
  function saveTodoTask(){
    const proj=projectFromName(val('tdProject'))||pData()[0], a=tData();
    a.push({id:id(),title:val('tdTitle')||'Nova tarefa',desc:val('tdDesc'),projectId:proj.id,section:val('tdSection')||'Geral',due:normalizeDue(val('tdDue')),priority:val('tdPriority')||'P4',labels:val('tdLabels').split(',').map(x=>x.trim()).filter(Boolean),status:val('tdSection')==='Concluída'?'Concluída':'A Fazer',done:val('tdSection')==='Concluída',recurrence:'Nenhuma',estimate:val('tdEstimate'),parentId:null,comments:[],createdAt:todayIso(),completedAt:null});
    saveTasks(a); closeSheet(); todoToday();
  }
  function newProjectForm(){
    form('Novo projeto',[{id:'pjName',label:'Nome do projeto'},{id:'pjColor',label:'Cor',value:'#e44332'},{id:'pjView',label:'Visualização',options:['list','board']},{id:'pjSections',label:'Seções separadas por vírgula',value:'A Fazer, Em andamento, Concluído'}],'saveProjectTodo');
  }
  function saveProjectTodo(){
    const p=pData();
    p.push({id:'p'+id(),name:val('pjName')||'Projeto',color:val('pjColor')||'#e44332',favorite:false,view:val('pjView')||'list',sections:val('pjSections').split(',').map(x=>x.trim()).filter(Boolean)});
    saveProjects(p); closeSheet(); todoProjects();
  }
  function toggleTask(i){ const a=tData(); if(!a[i])return; a[i].done=!a[i].done; a[i].status=a[i].done?'Concluída':'A Fazer'; a[i].completedAt=a[i].done?todayIso():null; saveTasks(a); todoToday(); }
  function editTaskTodo(i){ const t=tData()[i]; if(!t)return; form('Editar tarefa',[{id:'tdTitle',label:'Título',value:t.title},{id:'tdDesc',label:'Descrição',value:t.desc},{id:'tdDue',label:'Data',value:t.due},{id:'tdPriority',label:'Prioridade',options:['P1','P2','P3','P4']},{id:'tdLabels',label:'Etiquetas',value:t.labels.join(', ')}],`saveEditTodo:${i}`); setTimeout(()=>{ const p=document.getElementById('tdPriority'); if(p)p.value=t.priority; },50); }
  function saveEditTask(i){ const a=tData(),t=a[i]; if(!t)return; t.title=val('tdTitle')||t.title; t.desc=val('tdDesc'); t.due=normalizeDue(val('tdDue')); t.priority=val('tdPriority'); t.labels=val('tdLabels').split(',').map(x=>x.trim()).filter(Boolean); a[i]=t; saveTasks(a); closeSheet(); todoToday(); }
  function subtaskForm(i){ const parent=tData()[i]; if(!parent)return; form('Nova subtarefa',[{id:'subTitle',label:'Título'},{id:'subDue',label:'Data',value:parent.due},{id:'subPriority',label:'Prioridade',options:['P1','P2','P3','P4']}],`saveSubtask:${i}`); }
  function saveSubtask(i){ const a=tData(),p=a[i]; if(!p)return; a.push({id:id(),title:val('subTitle')||'Subtarefa',desc:'',projectId:p.projectId,section:p.section,due:normalizeDue(val('subDue')),priority:val('subPriority')||'P4',labels:p.labels,status:'A Fazer',done:false,recurrence:'Nenhuma',estimate:'',parentId:p.id,comments:[],createdAt:todayIso(),completedAt:null}); saveTasks(a); closeSheet(); todoToday(); }
  function commentForm(i){ const t=tData()[i]; if(!t)return; openSheet(`<h2>Comentário</h2><label class="field"><span>Comentário</span><textarea id="todoComment"></textarea></label><div class="row"><button class="btn alt" data-act="close">Cancelar</button><button class="btn" data-todo-save-comment="${i}">Salvar</button></div>`); }
  function saveComment(i){ const a=tData(); if(!a[i])return; a[i].comments.push({id:id(),date:todayIso(),text:val('todoComment')}); saveTasks(a); closeSheet(); todoToday(); }
  function cycleTask(i){ const a=tData(); if(!a[i])return; const order=['A Fazer','Em andamento','Concluída']; let n=(order.indexOf(a[i].status)+1)%order.length; a[i].status=order[n]; a[i].done=a[i].status==='Concluída'; a[i].completedAt=a[i].done?todayIso():null; saveTasks(a); todoBoard(); }

  views.todoSearch=todoSearch;
  views.today=todoToday; views.upcoming=todoUpcoming; views.projects=todoProjects; views.labels=todoLabels; views.filters=todoFilters; views.board=todoBoard; views.calendar=todoCalendar; views.karma=todoKarma;
  acts.quickTask=function(){taskFormTodo('inbox')}; acts.saveQuickTask=saveQuickTask; acts.newProject=newProjectForm; acts.saveProjectTodo=saveProjectTodo; acts.saveTodoTask=saveTodoTask;

  const oldContext=window.contextAdd;
  window.contextAdd=function(){
    if(String(vpCurrentScreen).startsWith('todo')||route==='prod') return taskFormTodo('inbox');
    return oldContext?oldContext():quickAdd();
  };

  document.body.addEventListener('click',function(e){
    const tv=e.target.closest('[data-todo-view]'); if(tv){ const fn=views[tv.dataset.todoView]; if(fn)fn(); return; }
    const ta=e.target.closest('[data-todo-act]'); if(ta){ const fn=acts[ta.dataset.todoAct]; if(fn)fn(); return; }
    const tog=e.target.closest('[data-todo-toggle]'); if(tog){toggleTask(Number(tog.dataset.todoToggle));return;}
    const edit=e.target.closest('[data-todo-edit]'); if(edit){editTaskTodo(Number(edit.dataset.todoEdit));return;}
    const sub=e.target.closest('[data-todo-sub]'); if(sub){subtaskForm(Number(sub.dataset.todoSub));return;}
    const com=e.target.closest('[data-todo-comment]'); if(com){commentForm(Number(com.dataset.todoComment));return;}
    const sc=e.target.closest('[data-todo-save-comment]'); if(sc){saveComment(Number(sc.dataset.todoSaveComment));return;}
    const cyc=e.target.closest('[data-todo-cycle]'); if(cyc){cycleTask(Number(cyc.dataset.todoCycle));return;}
    const pt=e.target.closest('[data-todo-project-task]'); if(pt){taskFormTodo(pt.dataset.todoProjectTask);return;}
    const po=e.target.closest('[data-project-open]'); if(po){todoShell('Projeto','Detalhes do projeto selecionado.',projectDetailHtml(po.dataset.projectOpen),'projects');return;}
    const lo=e.target.closest('[data-label-open]'); if(lo){ const label=lo.dataset.labelOpen; todoShell('#'+label,'Tarefas com esta etiqueta.',taskListHtml(openTasks().filter(t=>t.labels.includes(label)),'Nenhuma tarefa.'),'labels');return;}
  });

  document.body.addEventListener('click',function(e){
    const b=e.target.closest('[data-act]');
    if(!b)return;
    const act=b.dataset.act;
    if(act&&act.startsWith('saveEditTodo:')){saveEditTask(Number(act.split(':')[1]));return;}
    if(act&&act.startsWith('saveSubtask:')){saveSubtask(Number(act.split(':')[1]));return;}
  },true);

  renderNav();
  if(route==='prod') todoToday();
})();
