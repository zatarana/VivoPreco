window.BackupService=(function(){
  function exportJson(){
    const data=StorageService.read();
    return JSON.stringify({app:'VivoPreco',format:'clean-core-backup',version:1,createdAt:new Date().toISOString(),data:data},null,2);
  }
  function download(){
    const blob=new Blob([exportJson()],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download='vivopreco-backup-'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function importJson(text){
    const parsed=JSON.parse(text);
    const data=parsed.data||parsed;
    if(!data||!Array.isArray(data.wallets)||!Array.isArray(data.transactions))throw new Error('Arquivo de backup inválido.');
    StorageService.write(data);
    return StorageService.read();
  }
  function summary(data){
    return {
      wallets:(data.wallets||[]).length,
      transactions:(data.transactions||[]).length,
      bills:(data.bills||[]).length,
      debts:(data.debts||[]).length,
      tasks:(data.tasks||[]).length,
      projects:(data.projects||[]).length
    };
  }
  return {exportJson,download,importJson,summary};
})();
