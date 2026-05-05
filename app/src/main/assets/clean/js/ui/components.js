window.Components=(function(){
  function metric(label,value,color){return `<div class="card metric" style="border-left:5px solid var(--color-${color||'primary'})"><small>${Dom.esc(label)}</small><strong>${Dom.esc(value)}</strong></div>`;}
  function card(title,body,cls){return `<div class="card ${cls||''}"><h3>${Dom.esc(title)}</h3><p>${body}</p></div>`;}
  function empty(text){return `<div class="empty">${Dom.esc(text)}</div>`;}
  function button(text,action,cls){return `<button class="btn ${cls||''}" data-action="${action}">${Dom.esc(text)}</button>`;}
  function mini(text,action,id,cls){return `<button class="mini ${cls||''}" data-action="${action}" data-id="${id||''}">${Dom.esc(text)}</button>`;}
  function field(id,label,type,value){return `<label class="field"><span>${Dom.esc(label)}</span><input id="${id}" type="${type||'text'}" value="${Dom.esc(value||'')}"></label>`;}
  function select(id,label,options,value){return `<label class="field"><span>${Dom.esc(label)}</span><select id="${id}">${options.map(o=>`<option ${o===value?'selected':''}>${Dom.esc(o)}</option>`).join('')}</select></label>`;}
  function sheet(title,body,saveAction){return `<h2>${Dom.esc(title)}</h2>${body}<div class="row"><button class="btn secondary" data-close-sheet="1">Cancelar</button><button class="btn" data-action="${saveAction}">Salvar</button></div>`;}
  return {metric,card,empty,button,mini,field,select,sheet};
})();
