// Salas autenticadas: o banco aplica as permissões; dados privados nunca saem daqui.
window.ATSUMesa=(()=>{'use strict';
let app=null,sala=null,epoch=0,poll=null,shareTimer=null,shareId='',lastSheet='',syncing=false,dragging=false,docs=[],privateRolls=[];
const $=id=>document.getElementById(id),api=(...args)=>ATSUOnline.api(...args),uuid=s=>/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(s),assets=new Map(),loadingAssets=new Map();let previewURL='',restoreCard=null;
const message=(s,bad=false)=>{$('mesaStatus').textContent=s;$('mesaStatus').className=bad?'note mesa-error':'hint'};
const master=()=>sala&&sala.mestre_id===app?.user.id;
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const button=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=()=>run(fn);return b};
async function run(fn){try{await fn()}catch(e){message(e.message,true)}}
function roomKey(){return 'atsu.mesa.v2.'+app.user.id}
function privateKey(){return 'atsu.mesa.privada.'+app.user.id+'.'+sala.id}
function remember(){try{localStorage.setItem(roomKey(),sala.id)}catch{}}
function revokeAssets(){loadingAssets.clear();if($('documentDialog').open)$('documentDialog').close();assets.forEach(v=>URL.revokeObjectURL(v));assets.clear()}
function stop(){epoch++;clearInterval(poll);clearTimeout(shareTimer);poll=null;shareId='';lastSheet='';sala=null;privateRolls=[];app=null;syncing=false;revokeAssets();$('mesaInside').hidden=true;$('mesaLobby').hidden=false;$('privateHistory').replaceChildren();$('mesaMembers').replaceChildren();$('mesaRolls').replaceChildren();$('boardCanvas').replaceChildren();$('roomTag').hidden=true}
function changed(){if(!sala||!shareId)return;if(!app.hasCharacter(shareId)){run(unshare);return}clearTimeout(shareTimer);shareTimer=setTimeout(()=>run(publish),450)}
async function publish(){
 if(!sala||app.current()?.id!==shareId)return;
 const ficha=ATSUSala.limparFicha(app.current()),body=JSON.stringify(ficha);if(body===lastSheet)return;
 const version=epoch;
 await api('/rest/v1/sala_membros?sala_id=eq.'+sala.id+'&user_id=eq.'+app.user.id,{ficha,apelido:ficha.name,updated_at:new Date().toISOString()},'PATCH');
 if(version===epoch){lastSheet=body;await sync()}
}
async function unshare(){if(!sala)return;shareId='';lastSheet='';await api('/rest/v1/sala_membros?sala_id=eq.'+sala.id+'&user_id=eq.'+app.user.id,{ficha:null},'PATCH');await sync()}
async function share(){if(!sala)return;if(!app.current()){message('Crie ou abra uma ficha antes de compartilhar.',true);return}shareId=app.current().id;lastSheet='';await publish();message('Somente o resumo da ficha está compartilhado com a sala.')}
async function roll(r){
 if(!sala||!shareId||app.current()?.id!==shareId)return;
 const target=sala.id,name=String(app.current().name).slice(0,60);
 await run(async()=>{await api('/rest/v1/sala_rolagens',{sala_id:target,nome:name,habilidade:r.skill,a:r.a,b:r.b,nivel:r.level,modificador:r.mod,alvo:r.target});if(sala?.id===target)await sync()});
}
function switchArea(area){$('mesaPanel').hidden=area!=='painel';$('mesaBoard').hidden=area!=='documentos';document.querySelectorAll('[data-room-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.roomView===area)));if(area==='documentos')run(sync)}
async function rooms(){
 const version=epoch,list=await api('/rest/v1/salas?select=id,nome,codigo,mestre_id&order=created_at.desc',undefined,'GET');if(version!==epoch)return;
 const root=$('mesaRooms');root.replaceChildren();for(const r of list)root.append(button(r.nome+(r.mestre_id===app.user.id?' · Mestre':''),()=>enter(r)));if(!list.length)root.append(el('p','Você ainda não participa de uma sala.','small'));
}
async function enter(r){
 if(!uuid(r.id))throw Error('Sala inválida.');
 epoch++;clearInterval(poll);revokeAssets();shareId='';lastSheet='';sala=r;remember();syncing=false;
 // A função de entrada garante a associação autenticada, inclusive para o criador.
 const version=epoch;
 await api('/rest/v1/rpc/entrar_sala',{p_codigo:r.codigo,p_apelido:master()?'Mestre':'Investigador'});if(version!==epoch)return;
 $('mesaLobby').hidden=true;$('mesaInside').hidden=false;$('mesaRoomName').textContent=r.nome;$('mesaInvite').textContent=r.codigo;$('mesaRole').textContent=master()?'Você é o Mestre desta sala':'Você está na sala como jogador';$('mesaPrivate').hidden=!master();
 $('roomTag').hidden=false;$('roomTag').textContent='● Mesa '+r.codigo;$('roomTag').className='tag live';
 privateRolls=[];if(master())try{const saved=JSON.parse(sessionStorage.getItem(privateKey())||'[]');if(Array.isArray(saved))privateRolls=saved.slice(0,40)}catch{}renderPrivate();
 switchArea('painel');message('Sala aberta. A mesa atualiza a cada 4 segundos.');await sync();if(version===epoch)poll=setInterval(()=>run(sync),4000);
}
async function join(code){
 code=String(code||'').trim().toUpperCase();if(!/^[A-Z0-9]{6,12}$/.test(code))throw Error('Confira o código da sala.');
 const version=epoch;const result=await api('/rest/v1/rpc/entrar_sala',{p_codigo:code,p_apelido:'Investigador'});if(version!==epoch)return;await enter(Array.isArray(result)?result[0]:result);
}
async function sync(force=false){
 if(!sala||syncing)return;syncing=true;const id=sala.id,version=epoch;
 try{
  const [members,rolls,cards]=await Promise.all([
   api('/rest/v1/sala_membros?sala_id=eq.'+id+'&select=user_id,apelido,ficha,updated_at',undefined,'GET'),
   api('/rest/v1/sala_rolagens?sala_id=eq.'+id+'&select=*&order=created_at.desc&limit=40',undefined,'GET'),
   api('/rest/v1/sala_documentos?sala_id=eq.'+id+'&select=*&order=id',undefined,'GET')]);
  if(version!==epoch)return;docs=cards;renderMembers(members);renderRolls(rolls);if(force||(!dragging&&!document.activeElement?.closest('.board-card')))renderBoard();
 }finally{if(version===epoch)syncing=false}
}
function renderMembers(members){
 const root=$('mesaMembers');root.replaceChildren();for(const m of members){
  const card=el('article',undefined,'member');card.append(el('b',m.ficha?.name||m.apelido||'Investigador'),el('span',m.user_id===sala.mestre_id?' · Mestre':m.user_id===app.user.id?' · você':'','small'));
  const f=ATSUSala.limparFicha(m.ficha);if(f){card.append(el('p',f.job,'small'),el('p',`Vida ${f.hp}/${f.hpMax} · Sanidade ${f.san}/${f.sanMax} · Raiz ${f.root}`));const skills=el('div',undefined,'room-skills');for(const [k,n] of [['eloquencia','Eloquência'],['forca','Força'],['medicina','Medicina'],['ocultismo','Ocultismo'],['psicologia','Psicologia'],['visao','Visão'],['investigacao','Investigação']])skills.append(el('span',n+' '+f.skills[k],'pill'));card.append(skills)}else card.append(el('p','Ainda não compartilhou uma ficha.','small'));root.append(card);
 }
 if(!members.length)root.append(el('p','Nenhum participante ainda.','small'));
}
function renderRolls(rolls){const root=$('mesaRolls');root.replaceChildren();for(const r of rolls){const card=el('div',undefined,'hist');const critical=r.a===6&&r.b===6?'SUCESSO CRÍTICO':r.a===1&&r.b===1?'FALHA CRÍTICA':r.total>=r.alvo?'SUCESSO':'FALHA';card.append(el('span',r.nome+' · '+r.habilidade),el('span',`${r.a}+${r.b} + ${r.nivel} ${r.modificador>=0?'+':''}${r.modificador} = ${r.total} / ${r.alvo} · ${critical}`));root.append(card)}if(!rolls.length)root.append(el('p','As rolagens públicas dos jogadores aparecerão aqui.','small'))}
function renderPrivate(){const root=$('privateHistory');root.replaceChildren();if(!master())return;for(const r of privateRolls)root.append(el('div',String(r),'hist'))}
async function patch(card,values){const version=epoch;const result=await api('/rest/v1/sala_documentos?id=eq.'+card.id+'&revisao=eq.'+card.revisao,{...values,revisao:card.revisao+1},'PATCH',{Prefer:'return=representation'});if(version!==epoch)return;if(!result.length){await sync(true);throw Error('Este cartão foi alterado por outra pessoa. Atualize o mural e tente novamente.')}Object.assign(card,result[0]);await sync(!('x' in values||'y' in values))}
async function blob(card){const path=card.caminho.split('/').map(encodeURIComponent).join('/');return api('/storage/v1/object/mesa-documentos/'+path,undefined,'GET',{},'blob')}
async function imageURL(card){
 if(assets.has(card.id))return assets.get(card.id);
 if(loadingAssets.has(card.id))return loadingAssets.get(card.id);
 const version=epoch;
 const pending=blob(card).then(data=>{if(version!==epoch)throw Error('A sala foi alterada.');if(!['image/png','image/jpeg','image/webp'].includes(data.type.split(';')[0].toLowerCase()))throw Error('O servidor não retornou uma imagem PNG, JPEG ou WebP.');const url=URL.createObjectURL(data);assets.set(card.id,url);return url}).finally(()=>{if(loadingAssets.get(card.id)===pending)loadingAssets.delete(card.id)});
 loadingAssets.set(card.id,pending);return pending;
}
async function openFile(card){const data=await blob(card),url=URL.createObjectURL(data),a=el('a');a.href=url;a.download=card.titulo+(card.tipo==='arquivo'&&!card.titulo.toLowerCase().endsWith('.pdf')?'.pdf':'');document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
async function preview(card){
 const dialog=$('documentDialog'),root=$('documentContent'),version=epoch;
 root.replaceChildren();$('documentTitle').textContent=card.titulo;$('documentStatus').textContent='Carregando documento…';dialog.showModal();
 try{
  if(card.tipo==='imagem'){const url=await imageURL(card);if(version!==epoch||!dialog.open)return;const img=el('img');img.alt=card.titulo;img.src=url;root.append(img)}
  else{const data=await blob(card);if(version!==epoch||!dialog.open)return;if(data.type.split(';')[0]!=='application/pdf')throw Error('O servidor não retornou um PDF.');previewURL=URL.createObjectURL(data);const object=el('object');object.type='application/pdf';object.data=previewURL;object.setAttribute('aria-label',card.titulo);object.append(el('p','Se seu navegador não exibir o PDF, use Baixar arquivo.'));root.append(object)}
  $('documentStatus').textContent='';root.append(button('Baixar arquivo',()=>openFile(card)));
 }catch(e){if(version===epoch&&dialog.open)$('documentStatus').textContent=e.message}
}

function renderBoard(){
 const root=$('boardCanvas');root.replaceChildren();const version=epoch;
 for(const [id,url] of assets)if(!docs.some(d=>d.id===id)){URL.revokeObjectURL(url);assets.delete(id)}
 for(const card of docs){
  const node=el('article',undefined,'board-card');node.addEventListener('pointerdown',()=>{document.querySelectorAll('.board-card').forEach(n=>n.style.zIndex='');node.style.zIndex='2'});node.style.left=card.x+'px';node.style.top=card.y+'px';
  const handle=el('button',card.titulo,'board-handle');handle.type='button';handle.setAttribute('aria-label','Mover cartão: '+card.titulo);node.append(handle);
  if(card.tipo==='imagem'){
   const img=el('img');img.alt=card.titulo;img.draggable=false;img.hidden=true;const hint=el('p','Carregando imagem…','board-body');node.append(img,hint);
   const load=async()=>{hint.textContent='Carregando imagem…';img.hidden=true;try{const url=await imageURL(card);if(version!==epoch)return;img.onload=()=>{hint.replaceChildren();img.hidden=false};img.onerror=()=>{img.hidden=true;hint.textContent='O arquivo foi recebido, mas o navegador não conseguiu abrir a imagem.'};img.src=url}catch(e){if(version===epoch){hint.replaceChildren(el('span','Não foi possível carregar: '+e.message));hint.append(button('Tentar carregar novamente',load))}}};
   load();
  }

  if(card.texto)node.append(el('p',card.texto,'board-body'));
  const actions=el('div',undefined,'actions');if(card.caminho){actions.append(button('Visualizar',()=>preview(card)),button('Baixar arquivo',()=>openFile(card)));if(card.autor_id===app.user.id||master())actions.append(button('Reenviar arquivo',()=>{restoreCard=card;$('boardRestoreFile').click()}))}
  actions.append(button('Editar',async()=>{const title=await app.ask({title:'Título do cartão',input:card.titulo});if(!title)return;let texto=card.texto;if(card.tipo==='nota'){texto=await app.ask({title:'Texto da nota',input:card.texto,maxlength:10000});if(texto===null)return}await patch(card,{titulo:title.slice(0,100),texto})}));
  if(card.autor_id===app.user.id||master())actions.append(button('Remover',async()=>{if(!await app.ask({title:'Remover este cartão?',text:'O documento será removido da sala.'}))return;const target=epoch;if(card.caminho)await api('/storage/v1/object/mesa-documentos',{prefixes:[card.caminho]},'DELETE');await api('/rest/v1/sala_documentos?id=eq.'+card.id,undefined,'DELETE');if(target===epoch){document.activeElement.blur();await sync(true)}}));
  node.append(actions);root.append(node);
  handle.onpointerdown=e=>{if(e.button!==0)return;dragging=true;handle.setPointerCapture(e.pointerId);const sx=e.clientX,sy=e.clientY,x=card.x,y=card.y;let nx=x,ny=y;
   handle.onpointermove=ev=>{nx=Math.max(0,Math.min(2400,Math.round(x+ev.clientX-sx)));ny=Math.max(0,Math.min(1800,Math.round(y+ev.clientY-sy)));node.style.left=nx+'px';node.style.top=ny+'px'};
   const finish=()=>{dragging=false;handle.onpointermove=null;handle.onpointerup=null;handle.onpointercancel=null;if(nx!==x||ny!==y)run(()=>patch(card,{x:nx,y:ny}))};handle.onpointerup=finish;handle.onpointercancel=finish;
  };
  handle.onkeydown=e=>{const d={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]}[e.key];if(!d)return;e.preventDefault();run(()=>patch(card,{x:Math.max(0,Math.min(2400,card.x+d[0])),y:Math.max(0,Math.min(1800,card.y+d[1]))})).then(()=>{node.style.left=card.x+'px';node.style.top=card.y+'px'})};
 }
 if(!docs.length)root.append(el('p','Seu mural começa aqui. Adicione uma nota, imagem ou PDF.','board-empty'));
}
function start(adapter){
 stop();app=adapter;
 $('documentClose').onclick=()=>$('documentDialog').close();$('documentDialog').onclose=()=>{if(previewURL){URL.revokeObjectURL(previewURL);previewURL=''}$('documentContent').replaceChildren()};
 $('mesaCreate').onsubmit=e=>{e.preventDefault();run(async()=>{const version=epoch;const list=await api('/rest/v1/salas',{nome:$('mesaName').value.trim()},'POST',{Prefer:'return=representation'});if(version!==epoch)return;await enter(list[0]);await rooms()})};
 $('mesaJoin').onsubmit=e=>{e.preventDefault();run(()=>join($('mesaCode').value))};
 $('mesaShare').onclick=()=>run(share);$('mesaUnshare').onclick=()=>run(unshare);
 $('mesaCopy').onclick=()=>run(async()=>{if(!sala)return;const url=new URL(location.href);url.search='';url.searchParams.set('sala',sala.codigo);await navigator.clipboard.writeText(url.href);message('Convite copiado.')});
 $('mesaExit').onclick=()=>run(async()=>{if(!sala)return;const id=sala.id,user=app.user.id;await api('/rest/v1/sala_membros?sala_id=eq.'+id+'&user_id=eq.'+user,undefined,'DELETE');try{localStorage.removeItem(roomKey())}catch{}const adapter=app;stop();start(adapter);message('Você saiu da sala. Seu resumo não aparece mais na mesa.')});
 document.querySelectorAll('[data-room-view]').forEach(b=>b.onclick=()=>switchArea(b.dataset.roomView));
 $('privateRollForm').onsubmit=e=>{e.preventDefault();if(!master())return;const count=Math.max(1,Math.min(10,Number($('privateDiceCount').value))),sides=Number($('privateDiceSides').value),mod=Math.max(-99,Math.min(99,Number($('privateDiceMod').value)));if(![4,6,8,10,12,20,100].includes(sides))return;const values=Array.from({length:count},()=>app.randomSide(sides));privateRolls.unshift(`${count}D${sides} ${mod>=0?'+':''}${mod}: ${values.join(' + ')} = ${values.reduce((a,b)=>a+b,0)+mod}`);privateRolls=privateRolls.slice(0,40);try{sessionStorage.setItem(privateKey(),JSON.stringify(privateRolls))}catch{}renderPrivate()};
 $('privateClear').onclick=()=>{if(!master())return;privateRolls=[];try{sessionStorage.removeItem(privateKey())}catch{}renderPrivate()};
 $('boardNote').onsubmit=e=>{e.preventDefault();run(async()=>{if(!sala)return;await api('/rest/v1/sala_documentos',{id:crypto.randomUUID(),sala_id:sala.id,titulo:$('boardTitle').value.trim(),texto:$('boardText').value,tipo:'nota',x:20+(docs.length%4)*300,y:Math.min(1800,20+Math.floor(docs.length/4)*380)});$('boardNote').reset();await sync(true)})};
 $('boardRefresh').onclick=()=>run(()=>sync(true));
 $('boardRestoreFile').onchange=e=>{const file=e.target.files?.[0],card=restoreCard;e.target.value='';restoreCard=null;if(!file||!card||!sala||card.sala_id!==sala.id)return;run(async()=>{if(file.size>10*1024*1024)throw Error('O limite é 10 MB por arquivo.');const allowed=card.tipo==='arquivo'?['application/pdf']:['image/png','image/jpeg','image/webp'];if(!allowed.includes(file.type))throw Error(card.tipo==='arquivo'?'Selecione um PDF.':'Selecione uma imagem PNG, JPEG ou WebP.');if(!card.caminho.startsWith(sala.id+'/'+card.id+'.'))throw Error('Caminho do cartão inválido.');const version=epoch;message('Reenviando arquivo…');await api('/storage/v1/object/mesa-documentos/'+card.caminho.split('/').map(encodeURIComponent).join('/'),file,'POST',{'Content-Type':file.type});if(version!==epoch)return;if(assets.has(card.id)){URL.revokeObjectURL(assets.get(card.id));assets.delete(card.id)}message('Arquivo restaurado. O cartão e sua posição foram preservados.');await sync(true)})};
 $('boardFile').onchange=e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;run(async()=>{if(!sala)return;if(file.size>10*1024*1024)throw Error('O limite é 10 MB por arquivo.');const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','application/pdf':'pdf'}[file.type];if(!ext)throw Error('Envie uma imagem PNG, JPEG, WebP ou um PDF.');const id=crypto.randomUUID(),target=sala.id,path=target+'/'+id+'.'+ext,version=epoch;message('Enviando arquivo…');await api('/storage/v1/object/mesa-documentos/'+path,file,'POST',{'Content-Type':file.type});if(version!==epoch){await api('/storage/v1/object/mesa-documentos',{prefixes:[path]},'DELETE');return}try{await api('/rest/v1/sala_documentos',{id,sala_id:target,titulo:file.name.slice(0,100),tipo:ext==='pdf'?'arquivo':'imagem',caminho:path,x:20+(docs.length%4)*300,y:Math.min(1800,20+Math.floor(docs.length/4)*380)})}catch(e){
 // Uma resposta perdida não prova que o cadastro falhou. Confirme antes de apagar.
 if(version!==epoch)throw e;
 let rows=null;try{rows=await api('/rest/v1/sala_documentos?id=eq.'+id+'&select=id',undefined,'GET')}catch{}
 if(version!==epoch)throw e;
 if(!rows)throw Error('O arquivo foi enviado, mas não foi possível confirmar o cartão. Ele foi mantido; atualize o mural antes de tentar novamente.');
 if(!rows.length){await api('/storage/v1/object/mesa-documentos',{prefixes:[path]},'DELETE');throw e}
 }message('Arquivo adicionado à sala.');await sync(true)})};
 run(async()=>{await rooms();let id='';try{id=localStorage.getItem(roomKey())||''}catch{}const code=new URLSearchParams(location.search).get('sala');if(code){await join(code);app.selectMesa()}else if(uuid(id)){const list=await api('/rest/v1/salas?id=eq.'+id+'&select=*',undefined,'GET');if(list.length)await enter(list[0])}});
}
return {start,stop,changed,roll,share};
})();
