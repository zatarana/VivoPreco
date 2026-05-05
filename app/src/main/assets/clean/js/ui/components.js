window.Components=(function(){
  function cls(variant){return variant?' '+variant:'';}
  function button(label,action,variant){return `<button class="btn${cls(variant)}" data-action="${Dom.esc(action)}">${Dom.esc(label)}</button>`;}
  function mini(label,action,id,variant){return `<button class="mini${cls(variant)}" data-action="${Dom.esc(action)}" data-id="${Dom.esc(id||'')}">${Dom.esc(label)}</button>`;}
  function metric(label,value,variant){return `<div class="card metric ${variant||''}"><small>${Dom.esc(label)}</small><strong>${Dom.esc(value)}</strong></div>`;}
  function card(title,body){return `<div class="card"><h3>${Dom.esc(title)}</h3><p>${body||''}</p></div>`;}
  function field(id,label,type,value){return `<label class="field"><span>${Dom.esc(label)}</span><input id="${Dom.esc(id)}" type="${Dom.esc(type||'text')}" value="${Dom.esc(value||'')}"></label>`;}
  function select(id,label,options,value){return `<label class="field"><span>${Dom.esc(label)}</span><select id="${Dom.esc(id)}">${(options||[]).map(o=>`<option ${String(o)===String(value)?'selected':''}>${Dom.esc(o)}</option>`).join('')}</select></label>`;}
  function sheet(title,content,action){return `<h2>${Dom.esc(title)}</h2>${content||''}<div class="row"><button class="btn secondary" data-close-sheet="1">Cancelar</button><button class="btn" data-action="${Dom.esc(action)}">Salvar</button></div>`;}
  function empty(text){return `<div class="empty">${Dom.esc(text||'Nada por aqui.')}</div>`;}
  function actions(primary,secondary){
    const p=Array.isArray(primary)?primary.join(''):primary||'';
    const s=Array.isArray(secondary)?secondary.join(''):secondary||'';
    if(!s)return `<div class="actions compact-actions">${p}</div>`;
    return `<div class="actions compact-actions action-standard">${p}<details class="secondary-actions"><summary class="mini">Mais</summary><div class="secondary-actions-menu">${s}</div></details></div>`;
  }
  function moreActions(items,label){
    const content=(items||[]).filter(Boolean).join('');
    if(!content)return '';
    return `<details class="secondary-actions"><summary class="mini">${Dom.esc(label||'Mais')}</summary><div class="secondary-actions-menu">${content}</div></details>`;
  }
  return {button,mini,metric,card,field,select,sheet,empty,actions,moreActions};
})();
