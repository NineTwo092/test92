const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'../extension');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const manifest=JSON.parse(read('manifest.json'));
const rules=Object.fromEntries(['youtube','music'].map(s=>[s,JSON.parse(read('rules/'+s+'.json'))]));
// Avaliador limitado à sintaxe usada aqui; não substitui o motor DNR do navegador.
function matches(rule,url,initiator,type){
 const u=new URL(url),host=new URL(initiator).hostname,c=rule.condition;
 if(!c.resourceTypes.includes(type)||!c.initiatorDomains.some(d=>host===d||host.endsWith('.'+d)))return false;
 const f=c.urlFilter.slice(2);
 if(f.endsWith('^')){const d=f.slice(0,-1);return u.hostname===d||u.hostname.endsWith('.'+d);}
 const slash=f.indexOf('/');return u.hostname===f.slice(0,slash)&&u.pathname.startsWith(f.slice(slash));
}
function worker(){
 let listener,failStorage=false,failDnr=false;const enabled=new Set(['youtube','music']),stored={};
 const chrome={runtime:{id:'test',getURL:f=>'chrome-extension://test/'+f,onMessage:{addListener:fn=>listener=fn}},storage:{local:{set:async data=>{if(failStorage)throw Error('disk');Object.assign(stored,data);}}},declarativeNetRequest:{getEnabledRulesets:async()=>[...enabled],updateEnabledRulesets:async o=>{if(failDnr)throw Error('dnr');o.enableRulesetIds.forEach(s=>enabled.add(s));o.disableRulesetIds.forEach(s=>enabled.delete(s));}}};
 vm.runInNewContext(read('background.js'),{chrome});
 const sender={id:'test',url:chrome.runtime.getURL('popup.html')};
 return {enabled,stored,listener,sender,failStorage:()=>failStorage=true,failDnr:()=>failDnr=true,send:message=>new Promise(resolve=>listener(message,sender,resolve))};
}
test('MV3, permissões mínimas e apenas sites HTTPS esperados',()=>{
 assert.equal(manifest.manifest_version,3);
 assert.deepEqual(manifest.permissions,['storage','declarativeNetRequest']);
 assert.equal(manifest.host_permissions,undefined);
 assert.deepEqual(manifest.content_scripts[0].matches,['https://www.youtube.com/*','https://music.youtube.com/*']);
 assert.equal(manifest.content_scripts[0].world,undefined);
 for(const s of manifest.declarative_net_request.rule_resources){assert.equal(s.enabled,true);assert.ok(fs.existsSync(path.join(root,s.path)));}
});
test('scripts e popup têm sintaxe válida e sem chamadas de rede',()=>{
 for(const f of ['background.js','content.js','popup.js']){const source=read(f);new vm.Script(source);assert.doesNotMatch(source,/fetch\s*\(|XMLHttpRequest|eval\s*\(|setInterval\s*\(/);}
 assert.ok(read('popup.html').includes('lang="pt-BR"'));
});
test('regras têm IDs únicos, ação block e escopo exato',()=>{
 for(const [site,list] of Object.entries(rules)){
 assert.equal(new Set(list.map(r=>r.id)).size,list.length);
 for(const r of list){assert.equal(r.action.type,'block');assert.deepEqual(r.condition.initiatorDomains,[site==='music'?'music.youtube.com':'www.youtube.com']);assert.ok(!r.condition.resourceTypes.includes('media'));}
 }
});
test('publicidade conhecida corresponde somente ao iniciador e tipo autorizados',()=>{
 for(const [site,list] of Object.entries(rules)){
 const origin=site==='music'?'https://music.youtube.com':'https://www.youtube.com';
 for(const url of ['https://googleads.g.doubleclick.net/pagead/ads','https://www.googleadservices.com/pagead/conversion','https://www.youtube.com/pagead/adview']){
 assert.ok(list.some(r=>matches(r,url,origin,'xmlhttprequest')));
 assert.ok(!list.some(r=>matches(r,url,'https://example.org','xmlhttprequest')));
 assert.ok(!list.some(r=>matches(r,url,origin,'main_frame')));
 }
 }
});
test('mídia, APIs, domínios semelhantes e outros sites são preservados',()=>{
 for(const list of Object.values(rules))for(const url of ['https://rr1.googlevideo.com/videoplayback?id=123','https://www.youtube.com/youtubei/v1/player','https://music.youtube.com/youtubei/v1/next','https://www.youtube.com/watch?v=123','https://doubleclick.net.evil.example/ad','https://www.youtube.com/pageaddress'])for(const origin of ['https://www.youtube.com','https://music.youtube.com'])for(const type of ['xmlhttprequest','media']) assert.ok(!list.some(r=>matches(r,url,origin,type)),url);
});
test('controle por site não altera o outro e persiste booleano',async()=>{
 const w=worker();assert.equal((await w.send({type:'set',site:'music',enabled:false})).ok,true);
 assert.ok(w.enabled.has('youtube'));assert.ok(!w.enabled.has('music'));assert.equal(w.stored.music,false);
 await w.send({type:'set',site:'music',enabled:true});assert.ok(w.enabled.has('music'));
});
test('mensagens inválidas e remetentes externos não mudam estado',async()=>{
 const w=worker();assert.equal((await w.send({type:'set',site:'other',enabled:false})).ok,false);
 assert.equal((await w.send({type:'set',site:'music',enabled:'false'})).ok,false);
 assert.equal(w.listener({type:'set',site:'music',enabled:false},{id:'evil',url:'https://www.youtube.com'},()=>{throw Error('responded');}),undefined);
 assert.deepEqual([...w.enabled],['youtube','music']);
});
test('falha de armazenamento desfaz regra e fila continua funcionando',async()=>{
 const w=worker();w.failStorage();assert.equal((await w.send({type:'set',site:'music',enabled:false})).ok,false);
 assert.ok(w.enabled.has('music'));assert.equal(w.stored.music,undefined);assert.equal((await w.send({type:'get'})).ok,true);
});
test('falha DNR não grava preferência cosmética',async()=>{
 const w=worker();w.failDnr();assert.equal((await w.send({type:'set',site:'youtube',enabled:false})).ok,false);assert.equal(w.stored.youtube,undefined);
});
test('comandos concorrentes são serializados',async()=>{
 const w=worker();await Promise.all([w.send({type:'set',site:'music',enabled:false}),w.send({type:'set',site:'music',enabled:true}),w.send({type:'set',site:'youtube',enabled:false})]);assert.ok(w.enabled.has('music'));assert.ok(!w.enabled.has('youtube'));assert.equal(w.stored.music,true);
});
function content(host,initial){
 let change,resolveInitial;const style={isConnected:false,remove(){this.isConnected=false;}},root={appendChild(s){s.isConnected=true;}};
 const chrome={storage:{onChanged:{addListener:fn=>change=fn},local:{get:()=>new Promise(r=>resolveInitial=r)}}};
 vm.runInNewContext(read('content.js'),{chrome,location:{hostname:host},document:{createElement:()=>style,head:root,documentElement:root}});
 return {style,change,resolve:()=>resolveInitial(initial)};
}
test('CSS ativa/desativa sem duplicação e ignora preferência do outro site',async()=>{
 const c=content('music.youtube.com',{music:true});c.resolve();await Promise.resolve();assert.ok(c.style.isConnected);
 c.change({youtube:{newValue:false}},'local');assert.ok(c.style.isConnected);
 c.change({music:{newValue:false}},'local');assert.ok(!c.style.isConnected);
 c.change({music:{newValue:true}},'local');assert.ok(c.style.isConnected);
 assert.doesNotMatch(c.style.textContent,/video-ads|video\s*\{|movie_player|ytp-ad/);
});
test('leitura inicial atrasada não sobrescreve alteração mais recente',async()=>{
 const c=content('www.youtube.com',{youtube:true});c.change({youtube:{newValue:false}},'local');c.resolve();await Promise.resolve();assert.ok(!c.style.isConnected);
});
