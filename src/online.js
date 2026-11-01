// Supabase Auth e PostgREST via HTTPS; nenhuma chave secreta no navegador.
window.ATSUOnline = (() => {
 'use strict';
 let app, session=null, bound=null, timer, busy=false, generation=0, refreshing;
 const config=window.ATSU_ONLINE||{}, base=(config.url||'').replace(/\/$/, '');
 const $=id=>document.getElementById(id);
 const status=text=>{$('onlineStatus').textContent=text};
 const validConfig=()=>/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base)&&!!config.key;
 function remember(){try{sessionStorage.setItem('atsu.auth',JSON.stringify(session))}catch{}}
 async function request(path,body,method='POST',authenticated=false,extra={}){
  if(authenticated){
   if(!session)throw Error('Entre novamente para salvar.');
   if(session.expires_at*1000<Date.now()+60000){
    if(!refreshing){const version=generation;refreshing=request('/auth/v1/token?grant_type=refresh_token',{refresh_token:session.refresh_token}).then(s=>{if(version!==generation)throw Error('A conta mudou.');session={...s,expires_at:Date.now()/1000+s.expires_in};remember()}).finally(()=>refreshing=null)}
    await refreshing;
   }
  }
  const response=await fetch(base+path,{method,headers:{apikey:config.key,'Content-Type':'application/json',...(authenticated?{Authorization:'Bearer '+session.access_token}:{}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
  if(!response.ok)throw Error(response.status===401?'Sessão expirada. Entre novamente.':'Não foi possível concluir. Verifique sua conexão e tente novamente.');
  return response.status===204?null:response.json();
 }
 function account(){
  $('onlineLogin').hidden=!!session;$('onlineAccount').hidden=!session;
  $('onlineEmailLabel').textContent=session?.user?.email||'';
 }
 async function list(){
  const version=generation;
  const rows=await request('/rest/v1/fichas?select=id,character,revision&order=updated_at.desc',undefined,'GET',true);
  if(version!==generation)return;
  const list=$('onlineSheets');list.replaceChildren();
  for(const row of rows){const button=document.createElement('button');button.textContent='Abrir '+String(row.character.name||'Investigador');button.type='button';button.onclick=()=>run(async()=>{
   if(!await app.confirm('Abrir ficha online?', 'A versão online será aberta como uma ficha neste aparelho. Exporte alterações locais que ainda não foram enviadas antes de continuar.'))return;
   // Releia a ficha: a lista pode estar desatualizada.
   const version=generation, latest=await request('/rest/v1/fichas?id=eq.'+row.id+'&select=id,character,revision',undefined,'GET',true);
   if(version!==generation)return;if(!latest.length)throw Error('Ficha não encontrada.');
   bound=null;const c=app.open(latest[0].character);bound={id:row.id,localId:c.id,revision:latest[0].revision,lastSaved:JSON.stringify(c)};status('Ficha online aberta. Alterações serão salvas automaticamente.');
  });list.append(button)}
 }
 async function save(){
  if(!session||!bound||busy||app.current()?.id!==bound.localId)return;
  if(JSON.stringify(app.current())===bound.lastSaved)return;
  busy=true;const target=bound,version=generation,character=JSON.parse(JSON.stringify(app.current()));
  status('Salvando online…');
  try{
   const rows=await request('/rest/v1/fichas?id=eq.'+target.id+'&revision=eq.'+target.revision,{character,revision:target.revision+1,updated_at:new Date().toISOString()},'PATCH',true,{Prefer:'return=representation'});
   if(version!==generation||target!==bound)return;
   if(!rows.length){bound=null;throw Error('Esta ficha mudou em outro aparelho. Exporte sua versão local e abra a ficha online novamente antes de continuar.');}
   target.revision=rows[0].revision;target.lastSaved=JSON.stringify(character);status('● Ficha salva online');
   if(JSON.stringify(app.current())!==JSON.stringify(character))changed();
  }catch(e){if(version===generation)status(e.message+' Sua cópia local foi mantida.');}
  finally{busy=false}
 }
 function changed(){clearTimeout(timer);timer=setTimeout(save,700)}
 async function run(fn){try{await fn()}catch(e){status(e.message)}}
 function start(adapter){
  app=adapter;
  if(!validConfig()){status('Salvamento online ainda não ativado. As fichas continuam salvas neste navegador.');$('onlineLogin').hidden=true;return;}
  try{session=JSON.parse(sessionStorage.getItem('atsu.auth')||'null');if(!session?.user?.id||!session.refresh_token)session=null}catch{session=null}
  account();if(session){status('Conta conectada. Abra uma ficha online ou envie a ficha atual.');run(list)}
  $('onlineLogin').onsubmit=event=>{event.preventDefault();run(async()=>{
   const button=$('sendCode');button.disabled=true;
   try{await request('/auth/v1/otp',{email:$('onlineEmail').value.trim(),create_user:true});status('Confira seu e-mail e digite o código recebido.');$('verifyCode').hidden=false}finally{button.disabled=false}
  })};
  $('verifyCode').onsubmit=event=>{event.preventDefault();run(async()=>{
   const s=await request('/auth/v1/verify',{email:$('onlineEmail').value.trim(),token:$('onlineCode').value.trim(),type:'email'});
   generation++;bound=null;session={...s,expires_at:Date.now()/1000+s.expires_in};remember();$('onlineCode').value='';$('verifyCode').hidden=true;account();status('Login concluído. Escolha uma ficha online ou envie a ficha atual.');await list();
  })};
  $('onlineLogout').onclick=()=>run(async()=>{
   // Invalida primeiro o vínculo de salvamento, inclusive com uma requisição em andamento.
   const token=session?.access_token;generation++;bound=null;clearTimeout(timer);session=null;remember();account();$('onlineSheets').replaceChildren();status('Você saiu. Suas fichas locais continuam neste aparelho.');
   if(token)await fetch(base+'/auth/v1/logout',{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+token}});
  });
  $('onlineRefresh').onclick=()=>run(list);
  $('onlineRetry').onclick=save;
  $('onlineUpload').onclick=()=>run(async()=>{
   if(!session||!app.current())return;
   if(!await app.confirm('Salvar esta ficha online?', 'A ficha completa, incluindo diário e anotações, será armazenada na sua conta.'))return;
   const character=JSON.parse(JSON.stringify(app.current())),version=generation;
   const rows=await request('/rest/v1/fichas',{id:crypto.randomUUID(),character},'POST',true,{Prefer:'return=representation'});
   if(version!==generation)return;
   if(app.current()?.id===character.id)bound={id:rows[0].id,revision:rows[0].revision,localId:character.id,lastSaved:JSON.stringify(character)};
   status('● Ficha salva online');await list();if(bound)changed();
  });
 }
 return {start,changed};
})();
