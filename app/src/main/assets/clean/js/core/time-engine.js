window.TimeEngine=(function(){
  const n=v=>Number(v||0);
  const r=v=>Math.round(n(v));
  function ensure(data){data.timeLogs=Array.isArray(data.timeLogs)?data.timeLogs:[];data.activeTimer=data.activeTimer||null;return data;}
  function task(data,taskId){return (data.tasks||[]).find(t=>t.id===taskId);}
  function project(data,projectId){return (data.projects||[]).find(p=>p.id===projectId);}
  function seriesIdFor(t){if(!t)return null;if(t.seriesId)return t.seriesId;if(t.recurrence&&t.recurrence!=='nenhuma')return 'series_'+String(t.title||t.id).toLowerCase().replace(/[^a-z0-9]+/g,'_');return null;}
  function addManualLog(data,taskId,minutes,note,date){ensure(data);const t=task(data,taskId);if(!t)throw new Error('Tarefa não encontrada.');const duration=Validators.positiveNumber(minutes,'Tempo');const log=Models.timeLog({taskId:t.id,projectId:t.projectId,seriesId:seriesIdFor(t),date:date||Models.today(),durationMinutes:r(duration),mode:'manual',note:Validators.safeText(note||'',240)});data.timeLogs.push(log);return log;}
  function startTimer(data,taskId){ensure(data);const t=task(data,taskId);if(!t)throw new Error('Tarefa não encontrada.');if(data.activeTimer&&data.activeTimer.status==='running')throw new Error('Já existe um cronômetro em andamento.');data.activeTimer={taskId:t.id,projectId:t.projectId,seriesId:seriesIdFor(t),startedAt:Models.now(),accumulatedSeconds:n(data.activeTimer&&data.activeTimer.accumulatedSeconds),status:'running'};return data.activeTimer;}
  function pauseTimer(data){ensure(data);const timer=data.activeTimer;if(!timer||timer.status!=='running')throw new Error('Nenhum cronômetro em andamento.');const elapsed=(Date.now()-new Date(timer.startedAt).getTime())/1000;timer.accumulatedSeconds=r(n(timer.accumulatedSeconds)+elapsed);timer.status='paused';timer.startedAt=null;return timer;}
  function resumeTimer(data){ensure(data);const timer=data.activeTimer;if(!timer||timer.status!=='paused')throw new Error('Nenhum cronômetro pausado.');timer.status='running';timer.startedAt=Models.now();return timer;}
  function currentSeconds(data){ensure(data);const timer=data.activeTimer;if(!timer)return 0;if(timer.status==='running')return r(n(timer.accumulatedSeconds)+(Date.now()-new Date(timer.startedAt).getTime())/1000);return r(timer.accumulatedSeconds);}
  function finishTimer(data,note){ensure(data);const timer=data.activeTimer;if(!timer)throw new Error('Nenhum cronômetro ativo.');const seconds=currentSeconds(data);const minutes=Math.max(1,Math.round(seconds/60));const t=task(data,timer.taskId);if(!t)throw new Error('Tarefa não encontrada.');const log=Models.timeLog({taskId:t.id,projectId:t.projectId,seriesId:timer.seriesId||seriesIdFor(t),date:Models.today(),durationMinutes:minutes,mode:'timer',note:Validators.safeText(note||'',240)});data.timeLogs.push(log);data.activeTimer=null;return log;}
  function cancelTimer(data){ensure(data);data.activeTimer=null;}
  function logsForTask(data,taskId){ensure(data);return data.timeLogs.filter(l=>l.taskId===taskId);}
  function taskTotal(data,taskId){return r(logsForTask(data,taskId).reduce((s,l)=>s+n(l.durationMinutes),0));}
  function seriesTotal(data,seriesId){ensure(data);if(!seriesId)return 0;return r(data.timeLogs.filter(l=>l.seriesId===seriesId).reduce((s,l)=>s+n(l.durationMinutes),0));}
  function projectTotal(data,projectId){ensure(data);return r(data.timeLogs.filter(l=>l.projectId===projectId).reduce((s,l)=>s+n(l.durationMinutes),0));}
  function dateTotal(data,date){ensure(data);return r(data.timeLogs.filter(l=>l.date===date).reduce((s,l)=>s+n(l.durationMinutes),0));}
  function monthTotal(data,month){ensure(data);return r(data.timeLogs.filter(l=>String(l.date||'').slice(0,7)===month).reduce((s,l)=>s+n(l.durationMinutes),0));}
  function projectReport(data,projectId){ensure(data);const p=project(data,projectId);const logs=data.timeLogs.filter(l=>l.projectId===projectId);const byTask={};logs.forEach(l=>{const t=task(data,l.taskId);const name=t?t.title:'Tarefa removida';byTask[name]=(byTask[name]||0)+n(l.durationMinutes);});return {project:p,total:projectTotal(data,projectId),today:dateTotalForProject(data,projectId,Models.today()),month:monthTotalForProject(data,projectId,new Date().toISOString().slice(0,7)),byTask};}
  function dateTotalForProject(data,projectId,date){ensure(data);return r(data.timeLogs.filter(l=>l.projectId===projectId&&l.date===date).reduce((s,l)=>s+n(l.durationMinutes),0));}
  function monthTotalForProject(data,projectId,month){ensure(data);return r(data.timeLogs.filter(l=>l.projectId===projectId&&String(l.date||'').slice(0,7)===month).reduce((s,l)=>s+n(l.durationMinutes),0));}
  function formatMinutes(minutes){const m=r(minutes);const h=Math.floor(m/60);const rest=m%60;if(h&&rest)return `${h}h${String(rest).padStart(2,'0')}`;if(h)return `${h}h`;return `${rest}min`;}
  return {ensure,seriesIdFor,addManualLog,startTimer,pauseTimer,resumeTimer,currentSeconds,finishTimer,cancelTimer,logsForTask,taskTotal,seriesTotal,projectTotal,dateTotal,monthTotal,projectReport,formatMinutes};
})();
