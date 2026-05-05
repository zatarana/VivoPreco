window.Dom=(function(){
  const $=s=>document.querySelector(s);
  const app=()=>$('#app');
  function esc(v){return String(v??'').replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));}
  function money(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));}
  function date(v){if(!v)return 'Sem data'; if(/^\d{4}-\d{2}-\d{2}$/.test(v)){const [y,m,d]=v.split('-');return `${d}/${m}/${y}`;} return v;}
  function setHeader(title,subtitle){$('#screen-title').textContent=title;$('#screen-subtitle').textContent=subtitle||'';}
  function render(html){app().innerHTML=html;}
  function toast(msg){const old=document.querySelector('.toast'); if(old)old.remove(); const el=document.createElement('div'); el.className='toast'; el.textContent=msg; document.body.appendChild(el); setTimeout(()=>el.remove(),2600);}
  function openSheet(html){$('#sheet').innerHTML=html;$('#sheet-backdrop').hidden=false;setTimeout(()=>{$('#sheet input,#sheet select,#sheet textarea,#sheet button')?.focus();},40);}
  function closeSheet(){$('#sheet-backdrop').hidden=true;$('#sheet').innerHTML='';}
  document.addEventListener('click',e=>{if(e.target.id==='sheet-backdrop')closeSheet(); if(e.target.dataset.closeSheet)closeSheet();});
  return {$,app,esc,money,date,setHeader,render,toast,openSheet,closeSheet};
})();
