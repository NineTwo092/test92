// Serializa comandos para preservar a consistência entre rede e interface.
const SITES = ['youtube', 'music'];
let queue = Promise.resolve();
async function readState() {
  const enabled = await chrome.declarativeNetRequest.getEnabledRulesets();
  return Object.fromEntries(SITES.map(site => [site, enabled.includes(site)]));
}
async function apply(site, enabled) {
  if (!SITES.includes(site) || typeof enabled !== 'boolean') throw Error('Configuração inválida');
  const before = await readState();
  await chrome.declarativeNetRequest.updateEnabledRulesets({enableRulesetIds:enabled?[site]:[], disableRulesetIds:enabled?[]:[site]});
  try { await chrome.storage.local.set({[site]:enabled}); }
  catch(error) {
    await chrome.declarativeNetRequest.updateEnabledRulesets({enableRulesetIds:before[site]?[site]:[],disableRulesetIds:before[site]?[]:[site]});
    throw error;
  }
  return readState();
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('popup.html')) return;
  if (message?.type !== 'get' && message?.type !== 'set') return;
  queue = queue.catch(()=>{}).then(async()=>{
    try { reply({ok:true,state:message.type==='get'?await readState():await apply(message.site,message.enabled)}); }
    catch { reply({ok:false,error:'Não foi possível salvar. Tente novamente.'}); }
  });
  return true;
});
