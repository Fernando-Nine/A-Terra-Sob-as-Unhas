// Supabase Auth e PostgREST via HTTPS; nenhuma chave secreta no navegador.
window.ATSUOnline = (() => {
 'use strict';
 let app, session=null, bound=null, timer, busy=false, generation=0, refreshing, renewal, mode='login';
 const config=window.ATSU_ONLINE||{}, base=(config.url||'').replace(/\/$/, '');
 const $=id=>document.getElementById(id);
 const status=(text,kind='info')=>{const node=$('appScreen').hidden?$('authStatus'):$('onlineStatus');node.textContent=text;node.dataset.kind=kind};
 const validConfig=()=>/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base)&&!!config.key;
 function remember(){try{if(session)sessionStorage.setItem('atsu.auth',JSON.stringify(session));else sessionStorage.removeItem('atsu.auth')}catch{}}
 function lock(message='Entre para acessar suas fichas.'){
  generation++;bound=null;clearTimeout(timer);clearTimeout(renewal);session=null;remember();
  $('appScreen').hidden=true;$('authScreen').hidden=false;$('onlineLogin').hidden=false;
  app.leave();$('onlineSheets').replaceChildren();$('onlinePassword').value='';$('authConfirmPassword').value='';status(message);
 }
 function unlock(){
  app.enter(session.user);$('authScreen').hidden=true;$('appScreen').hidden=false;account();
  $('homeTitle').focus();clearTimeout(renewal);
  renewal=setTimeout(restore,Math.max(1000,(session.expires_at*1000-Date.now()-45000)));
 }
 async function restore(){
  const version=generation;
  try{
   const user=await request('/auth/v1/user',undefined,'GET',true);
   if(version!==generation)return;
   if(!user?.id||user.id!==session?.user?.id)throw Error('Entre novamente para acessar sua conta.');
   const alreadyOpen=!$('appScreen').hidden;session.user=user;remember();
   if(!alreadyOpen){unlock();status('Conta conectada. Suas fichas estão na seção Fichas.');run(list)}
   else{clearTimeout(renewal);renewal=setTimeout(restore,Math.max(1000,session.expires_at*1000-Date.now()-45000))}
  }catch(e){if(version===generation)lock('Não foi possível validar sua sessão. Entre novamente.');}
 }
 async function request(path,body,method='POST',authenticated=false,extra={},format='json'){
  if(authenticated){
   if(!session)throw Error('Entre novamente para salvar.');
   if(session.expires_at*1000<Date.now()+60000){
    if(!refreshing){const version=generation;refreshing=request('/auth/v1/token?grant_type=refresh_token',{refresh_token:session.refresh_token}).then(s=>{if(version!==generation)throw Error('A conta mudou.');session={...s,expires_at:Date.now()/1000+s.expires_in};remember()}).finally(()=>refreshing=null)}
    await refreshing;
   }
  }
  let response;
  try{response=await fetch(base+path,{method,headers:{apikey:config.key,'Content-Type':'application/json',...(authenticated?{Authorization:'Bearer '+session.access_token}:{}),...extra},...(body===undefined?{}:{body:body instanceof Blob?body:JSON.stringify(body)})});}
  catch{throw Error('Não foi possível conectar. Verifique sua conexão e tente novamente.');}
  if(!response.ok){
   const error=await response.json().catch(()=>({}));
   // GoTrue retorna `code` numérico e o motivo em `error_code`/`msg`.
   const reason=String(error.error_code||error.code||'');
   const message=String(error.msg||error.message||error.error_description||error.error||'').replace(/[\u0000-\u001f]/g,' ').slice(0,300);
   if(authenticated&&response.status===401){lock('Sua sessão expirou. Entre novamente.');throw Error('Sua sessão expirou. Entre novamente.');}
   if(reason==='email_not_confirmed')throw Error('Seu e-mail ainda não foi confirmado. O responsável pelo site precisa revisar a configuração da conta no Supabase.');
   if(reason==='invalid_credentials')throw Error('E-mail ou senha incorretos.');
   if(reason==='user_already_exists')throw Error('Não foi possível criar a conta. Se já tem cadastro, use Entrar.');
   if(reason==='weak_password')throw Error('Escolha uma senha mais forte, conforme as regras do site.');
   if(reason==='signup_disabled'||(!/^[a-zA-Z]/.test(reason)&&/signups (?:are disabled|not allowed)/i.test(message)))throw Error('O cadastro está desativado. O responsável precisa ativar Allow new users to sign up no Supabase.');
   if(reason==='email_provider_disabled')throw Error('O acesso por e-mail está desativado. O responsável precisa ativar o provedor Email no Supabase.');
   if(reason==='email_address_invalid')throw Error('Confira o endereço de e-mail informado.');
   if(reason==='email_address_not_authorized'||/error sending confirmation email/i.test(message))throw Error('O Supabase tentou enviar uma confirmação de e-mail, mas o envio não está disponível. Para este site, desative Confirm email e salve a configuração.');
   if(reason==='over_email_send_rate_limit')throw Error('O Supabase ainda está tentando enviar e-mails e atingiu o limite. O responsável precisa revisar Confirm email; aguarde antes de tentar de novo.');
   if(/invalid api key/i.test(message))throw Error('A chave pública do site não foi aceita pelo Supabase. O responsável precisa conferir a chave e a URL do mesmo projeto.');
   if(reason==='PGRST205'||reason==='PGRST202')throw Error(path.includes('sala')?'As salas ainda não foram ativadas. O responsável precisa executar supabase/rooms.sql no SQL Editor do Supabase.':'O banco de fichas ainda não foi preparado. O responsável precisa executar o script de criação da tabela no Supabase.');
   if(response.status===429)throw Error('Muitas tentativas. Aguarde antes de tentar novamente.');
   // O motivo é exibido como texto, nunca interpretado como HTML.
   const code=/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(reason)?' / '+reason:'';
   throw Error(`O serviço recusou a solicitação (HTTP ${response.status}${code}). ${message||'Não foi informado um motivo. Avise o responsável pelo site.'}`);
  }
  if(response.status===204||response.status===205)return null;
  if(format==='blob')return response.blob();
  // PostgREST confirma INSERT com 201 e corpo vazio por padrão.
  const text=await response.text();
  if(!text.trim())return null;
  return JSON.parse(text);
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
 async function run(fn){try{await fn()}catch(e){status(e.message,'error')}}
 function setMode(next){
  mode=next;const signup=mode==='signup';
  $('authModeLogin').setAttribute('aria-pressed',String(!signup));$('authModeSignup').setAttribute('aria-pressed',String(signup));
  $('authTitle').textContent=signup?'Sua história começa aqui.':'Bem-vindo de volta.';
  $('authSubtitle').textContent=signup?'Crie seu acesso ao arquivo dos investigadores.':'Entre para continuar a sua investigação.';
  $('authSubmit').textContent=signup?'Criar minha conta →':'Entrar no arquivo →';
  $('authConfirmField').hidden=!signup;$('authConfirmPassword').required=signup;$('authConfirmPassword').value='';
  $('onlinePassword').autocomplete=signup?'new-password':'current-password';
  $('passwordHint').textContent=signup?'Use pelo menos 8 caracteres e guarde sua senha. Não há recuperação por e-mail, e o endereço informado não é verificado.':'Use a senha da sua conta. A recuperação por e-mail ainda não está disponível.';
  status('');
 }
 function start(adapter){
  app=adapter;
  if(!validConfig()){status('O acesso ainda não foi configurado. Avise o responsável pelo site.','error');$('authSubmit').disabled=true;return;}
  try{session=JSON.parse(sessionStorage.getItem('atsu.auth')||'null');if(!session?.user?.id||!session.refresh_token||!session.access_token||!Number.isFinite(session.expires_at))session=null}catch{session=null}
  $('authModeLogin').onclick=()=>setMode('login');$('authModeSignup').onclick=()=>setMode('signup');
  $('authShowPassword').onclick=()=>{const visible=$('onlinePassword').type==='password';$('onlinePassword').type=visible?'text':'password';$('authShowPassword').textContent=visible?'Ocultar':'Mostrar';$('authShowPassword').setAttribute('aria-label',visible?'Ocultar senha':'Mostrar senha');$('authShowPassword').setAttribute('aria-pressed',String(visible))};
  if(session){status('Validando sua sessão…');$('authSubmit').disabled=true;restore().finally(()=>$('authSubmit').disabled=false)}
  $('onlineLogin').onsubmit=event=>{event.preventDefault();
   const signup=mode==='signup';
   run(async()=>{
    if(signup&&$('onlinePassword').value!==$('authConfirmPassword').value){status('As senhas não coincidem. Digite a mesma senha nos dois campos.','error');$('authConfirmPassword').focus();return;}
    const buttons=[$('authSubmit'),$('authModeLogin'),$('authModeSignup')];buttons.forEach(b=>b.disabled=true);
    try{
     const credentials={email:$('onlineEmail').value.trim(),password:$('onlinePassword').value};
     status(signup?'Criando conta…':'Entrando…');
     const s=await request(signup?'/auth/v1/signup':'/auth/v1/token?grant_type=password',credentials);
     if(!s.access_token||!s.refresh_token||!s.user?.id){
      status('O cadastro não iniciou uma sessão. O responsável precisa desativar Confirm email no Supabase. Não há envio de código neste site.');return;
     }
     generation++;bound=null;session={...s,expires_at:Date.now()/1000+s.expires_in};remember();$('onlinePassword').value='';$('authConfirmPassword').value='';unlock();status('Você está conectado. Acesse Fichas para abrir seu investigador.');await list();
    }finally{buttons.forEach(b=>b.disabled=false)}
   });
  };
  $('onlineLogout').onclick=()=>run(async()=>{
   // Invalida primeiro o vínculo de salvamento, inclusive com uma requisição em andamento.
   const token=session?.access_token;lock('Você saiu da conta. Até a próxima investigação.');$('onlineEmail').focus();
   if(token)await fetch(base+'/auth/v1/logout',{method:'POST',headers:{apikey:config.key,Authorization:'Bearer '+token}});
  });
  $('onlineRefresh').onclick=()=>run(list);
  $('onlineRetry').onclick=save;
  $('clearAllSheets').onclick=()=>run(async()=>{
   if(!session||!await app.confirm('Limpar todas as suas fichas?', 'As fichas locais e online desta conta serão removidas. Um backup JSON será baixado antes. As fichas das outras contas não serão alteradas.'))return;
   const version=generation,user=session.user.id;
   const rows=await request('/rest/v1/fichas?select=*',undefined,'GET',true);
   if(version!==generation)return;
   const backup={format:'ATSU-backup-1',exported:new Date().toISOString(),local:app.localBackup(),online:rows};
   // Se não for possível guardar o backup local, não apague as fichas.
   try{localStorage.setItem('atsu.backup.limpeza.'+user+'.'+Date.now(),JSON.stringify(backup))}catch{throw Error('Não foi possível guardar o backup. A limpeza foi cancelada.');}
   const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='Backup_fichas_'+new Date().toISOString().slice(0,10)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
   // Exclua somente os IDs inspecionados, sem apagar fichas novas de outro aparelho.
   bound=null;clearTimeout(timer);
   for(const row of rows){if(version!==generation)return;await request('/rest/v1/fichas?id=eq.'+encodeURIComponent(row.id),undefined,'DELETE',true);}
   if(version!==generation)return;app.clearLocal();await list();status('Todas as suas fichas foram removidas. O backup foi guardado neste navegador e baixado em JSON.');
  });
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
 return {start,changed,api:(path,body,method='POST',headers={},format='json')=>request(path,body,method,true,headers,format)};
})();
