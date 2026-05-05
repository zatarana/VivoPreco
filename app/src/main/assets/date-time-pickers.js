// Seletores globais de data e hora em pt-BR.
// Aplica em todos os formulários criados por openSheet/form, sem precisar editar cada tela.

(function(){
  document.documentElement.lang='pt-BR';

  function pad(n){return String(n).padStart(2,'0');}
  function isoToday(){return new Date().toISOString().slice(0,10);}
  function isoTomorrow(){const d=new Date();d.setDate(d.getDate()+1);return d.toISOString().slice(0,10);}
  function ptToIso(v){
    if(!v)return '';
    const s=String(v).trim();
    if(!s||s==='Sem data'||s==='Sem prazo'||s==='Próximo ciclo')return '';
    if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
    if(/^\d{2}\/\d{2}\/\d{4}$/.test(s)){const [d,m,y]=s.split('/');return `${y}-${m}-${d}`;}
    if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)){const [d,m,y]=s.split('/');return `${y}-${pad(m)}-${pad(d)}`;}
    if(/^\d{1,2}\/\d{1,2}$/.test(s)){const [d,m]=s.split('/');return `${new Date().getFullYear()}-${pad(m)}-${pad(d)}`;}
    if(/^\d{1,2}$/.test(s)){return `${new Date().getFullYear()}-${pad(new Date().getMonth()+1)}-${pad(s)}`;}
    if(/hoje/i.test(s))return isoToday();
    if(/amanh[ãa]/i.test(s))return isoTomorrow();
    return '';
  }
  function isoToPt(v){
    if(!v)return '';
    if(/^\d{4}-\d{2}-\d{2}$/.test(v)){const [y,m,d]=v.split('-');return `${d}/${m}/${y}`;}
    return v;
  }
  function looksDate(label,id,placeholder){
    const s=(label+' '+id+' '+placeholder).toLowerCase();
    return /(data|vencimento|prazo|dia|nascimento|previs[aã]o|fechamento|recebimento|pagamento|due|date|deadline|close)/i.test(s) && !looksTime(label,id,placeholder);
  }
  function looksTime(label,id,placeholder){
    const s=(label+' '+id+' '+placeholder).toLowerCase();
    return /(hora|hor[aá]rio|time|alarm|alarme|lembrete)/i.test(s);
  }
  function fieldLabel(input){
    const field=input.closest('.field');
    const span=field?field.querySelector('span'):null;
    return span?span.textContent:'';
  }
  function enhanceInput(input){
    if(!input||input.dataset.pickerEnhanced==='1')return;
    const label=fieldLabel(input), id=input.id||'', placeholder=input.placeholder||'';
    const isDate=looksDate(label,id,placeholder);
    const isTime=looksTime(label,id,placeholder);
    if(!isDate&&!isTime)return;
    input.dataset.pickerEnhanced='1';
    input.dataset.originalPlaceholder=placeholder;
    const field=input.closest('.field');
    if(field)field.classList.add('picker-enhanced');
    if(isDate){
      const previous=input.value;
      input.type='date';
      input.lang='pt-BR';
      const iso=ptToIso(previous);
      if(iso)input.value=iso;
      input.placeholder='DD/MM/AAAA';
      input.setAttribute('aria-label',(label||'Data')+' - selecione no calendário');
      addHelper(input,'Toque para abrir o calendário. Formato: DD/MM/AAAA.');
      addQuickDates(input);
    }
    if(isTime){
      const previous=input.value;
      input.type='time';
      input.lang='pt-BR';
      if(/^\d{1,2}:\d{2}$/.test(previous)){const [h,m]=previous.split(':');input.value=`${pad(h)}:${m}`;}
      input.placeholder='HH:MM';
      input.setAttribute('aria-label',(label||'Hora')+' - selecione no relógio');
      addHelper(input,'Toque para abrir o relógio. Formato: HH:MM.');
      addQuickTimes(input);
    }
  }
  function addHelper(input,text){
    const field=input.closest('.field');
    if(!field||field.querySelector('.picker-helper'))return;
    const helper=document.createElement('small');
    helper.className='picker-helper';
    helper.textContent=text;
    field.appendChild(helper);
  }
  function addQuickDates(input){
    const field=input.closest('.field');
    if(!field||field.querySelector('.picker-quick-row'))return;
    const row=document.createElement('div');
    row.className='picker-quick-row';
    row.innerHTML='<button type="button" class="picker-quick primary" data-pick-date="today">Hoje</button><button type="button" class="picker-quick" data-pick-date="tomorrow">Amanhã</button><button type="button" class="picker-quick" data-pick-date="clear">Sem data</button>';
    row.addEventListener('click',function(e){
      const b=e.target.closest('[data-pick-date]'); if(!b)return;
      const v=b.dataset.pickDate;
      if(v==='today')input.value=isoToday();
      else if(v==='tomorrow')input.value=isoTomorrow();
      else input.value='';
      input.dispatchEvent(new Event('change',{bubbles:true}));
    });
    field.appendChild(row);
  }
  function addQuickTimes(input){
    const field=input.closest('.field');
    if(!field||field.querySelector('.picker-quick-row'))return;
    const row=document.createElement('div');
    row.className='picker-quick-row';
    row.innerHTML='<button type="button" class="picker-quick primary" data-pick-time="08:00">08:00</button><button type="button" class="picker-quick" data-pick-time="12:00">12:00</button><button type="button" class="picker-quick" data-pick-time="18:00">18:00</button><button type="button" class="picker-quick" data-pick-time="clear">Sem hora</button>';
    row.addEventListener('click',function(e){
      const b=e.target.closest('[data-pick-time]'); if(!b)return;
      input.value=b.dataset.pickTime==='clear'?'':b.dataset.pickTime;
      input.dispatchEvent(new Event('change',{bubbles:true}));
    });
    field.appendChild(row);
  }
  function enhanceAll(){
    document.querySelectorAll('.sheet input, .content input, input').forEach(enhanceInput);
  }
  const oldOpenSheet=window.openSheet;
  if(typeof oldOpenSheet==='function'){
    window.openSheet=function(html){
      oldOpenSheet(html);
      setTimeout(enhanceAll,30);
    };
  }
  const oldForm=window.form;
  if(typeof oldForm==='function'){
    window.form=function(title,fields,save){
      const patched=(fields||[]).map(function(f){
        const label=(f.label||'').toLowerCase();
        const id=(f.id||'').toLowerCase();
        if(!f.options && looksDate(label,id,'')) return Object.assign({},f,{value:ptToIso(f.value)||f.value||''});
        return f;
      });
      oldForm(title,patched,save);
      setTimeout(enhanceAll,30);
    };
  }
  window.vpDateTime={ptToIso,isoToPt,enhanceAll};
  document.body.addEventListener('focusin',function(e){enhanceInput(e.target);});
  new MutationObserver(function(){setTimeout(enhanceAll,20);}).observe(document.body,{childList:true,subtree:true});
  setTimeout(enhanceAll,100);
})();
