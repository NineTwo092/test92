const sites=['youtube','music'];
const status=document.getElementById('status');
function lock(value){sites.forEach(site=>document.getElementById(site).disabled=value);}
async function request(message){
  lock(true);
  try{
    const response=await chrome.runtime.sendMessage(message);
    if(!response?.ok) throw Error(response?.error || 'Sem resposta da extensão.');
    sites.forEach(site=>document.getElementById(site).checked=response.state[site]);
    status.textContent=message.type==='set'?'Configuração salva. Filtros atualizados.':'Configuração local; sem coleta de dados.';
  }catch(error){status.textContent=error.message+' Feche e reabra este painel para conferir o estado.';return;}
  lock(false);
}
sites.forEach(site=>document.getElementById(site).addEventListener('change',event=>request({type:'set',site,enabled:event.target.checked})));
request({type:'get'});
