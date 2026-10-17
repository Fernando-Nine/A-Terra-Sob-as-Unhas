// Sala ao vivo (opcional) — usada pela página dos jogadores e pelo escudo.
//
// O site não tem servidor próprio: as mensagens passam por um broker MQTT
// público e gratuito, sem conta. Não há senha; quem souber o código da sala
// lê o que passa nela. Por isso só trafega o resumo da ficha (identidade,
// Vida, Sanidade, Raiz, níveis) e as últimas rolagens. Diário, anotações e
// tudo do escudo nunca são enviados.
//
// Tópicos, todos RETIDOS (quem entra depois recebe o último valor):
//   atsu/v1/<CÓDIGO>/online/<cid>    "1" | "0" (o "0" vem sozinho quando a aba fecha)
//   atsu/v1/<CÓDIGO>/ficha/<cid>     {t, ficha: resumo}
//   atsu/v1/<CÓDIGO>/rolagens/<cid>  as últimas 8 rolagens
// Mensagem vazia apaga o retido: é assim que alguém sai da sala.
const ATSUSala=(()=>{'use strict';
const SITE='https://fernando-nine.github.io/A-Terra-Sob-as-Unhas/';
const BROKER=new URLSearchParams(location.search).get('broker')||'wss://broker.emqx.io:8084/mqtt';
// A biblioteca MQTT só é baixada quando alguém entra numa sala. A página publicada
// usa a cópia ao lado dela; o escudo (aberto do computador) busca a mesma cópia no site.
const LIB=(location.protocol==='file:'?SITE+'site/':'')+'vendor/mqtt.min.js';
const LIB_SRI='sha384-9WWboT9UtuPFRlOLq4FygQkcJxzYcpz8SXGkNyCEXM+44n14xzjNlrRKYZwuF/A6';
const RAIZ='atsu/v1/',ALFABETO='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',CID=/^[a-z0-9]{2,32}$/;
const HABILIDADES=['eloquencia','forca','medicina','ocultismo','psicologia','visao','investigacao'];
const MAX_ROLAGENS=8;
const n=(v,a,b)=>{v=Math.trunc(+v);return Number.isFinite(v)?Math.max(a,Math.min(b,v)):a};
const ler=t=>{try{return JSON.parse(t)}catch{return null}};

let carregando=null;
function biblioteca(){
 if(window.mqtt)return Promise.resolve(window.mqtt);
 if(!carregando)carregando=new Promise((ok,erro)=>{const s=document.createElement('script');s.src=LIB;s.integrity=LIB_SRI;s.crossOrigin='anonymous';s.onload=()=>window.mqtt?ok(window.mqtt):erro(Error('mqtt'));s.onerror=()=>{carregando=null;s.remove();erro(Error('biblioteca'))};document.head.append(s)});
 return carregando}

function novoCodigo(){const a=new Uint32Array(6);crypto.getRandomValues(a);return Array.from(a,x=>ALFABETO[x%ALFABETO.length]).join('')}
const limparCodigo=c=>String(c??'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12);
// Identidade estável deste navegador na sala (sobrevive a recarregar a página).
function meuCid(chave){let c=null;try{c=localStorage.getItem(chave)}catch{}if(!c||!CID.test(c)){c='j'+Math.random().toString(36).slice(2,12);try{localStorage.setItem(chave,c)}catch{}}return c}
const topico=(codigo,tipo,cid)=>`${RAIZ}${codigo}/${tipo}/${cid||'+'}`;

// Tudo que chega da rede é de terceiros: só passa o que tem o formato esperado.
function limparFicha(f){if(!f||typeof f!=='object')return null;const hpMax=n(f.hpMax,1,99),sanMax=n(f.sanMax,1,99),skills={};HABILIDADES.forEach(k=>skills[k]=n(f.skills?.[k],0,5));
 return {name:String(f.name||'Sem nome').slice(0,60),job:String(f.job||'').slice(0,80),hp:n(f.hp,0,hpMax),hpMax,san:n(f.san,0,sanMax),sanMax,root:n(f.root,0,20),skills,ppTotal:n(f.ppTotal,0,999)}}
function limparRolagens(lista){return Array.isArray(lista)?lista.slice(0,MAX_ROLAGENS).filter(r=>r&&typeof r==='object').map(r=>({id:String(r.id||'').slice(0,16),t:Number(r.t)||0,name:String(r.name||'').slice(0,60),a:n(r.a,1,6),b:n(r.b,1,6),level:n(r.level,0,5),mod:n(r.mod,-3,3),total:n(r.total,-10,40),target:n(r.target,0,30),skill:String(r.skill||'').slice(0,40),ok:!!r.ok,crit:r.crit==='win'||r.crit==='lose'?r.crit:null})):[]}

// papel 'jogador' publica e marca presença; 'mestre' só escuta.
function conectar({codigo,cid,papel,aoMudar,aoConectar,aoReceber}){
 const jogador=papel==='jogador';let cliente=null,fechado=false;aoMudar('conectando');
 biblioteca().then(mqtt=>{if(fechado)return;
  cliente=mqtt.connect(BROKER,{clientId:'atsu-'+Math.random().toString(36).slice(2,10),clean:true,keepalive:30,reconnectPeriod:4000,connectTimeout:10000,
   will:jogador?{topic:topico(codigo,'online',cid),payload:'0',qos:1,retain:true}:undefined});
  cliente.on('connect',()=>{aoMudar('conectado');cliente.subscribe([topico(codigo,'online'),topico(codigo,'ficha'),topico(codigo,'rolagens')],{qos:1});
   if(jogador)cliente.publish(topico(codigo,'online',cid),'1',{qos:1,retain:true});if(aoConectar)aoConectar()});
  cliente.on('reconnect',()=>aoMudar('reconectando'));cliente.on('offline',()=>aoMudar('sem-conexao'));cliente.on('error',()=>aoMudar('sem-conexao'));
  // Confere a sala de novo aqui: não depende de o broker filtrar certo.
  cliente.on('message',(t,p)=>{if(!t.startsWith(RAIZ+codigo+'/'))return;const partes=t.split('/'),quem=partes.pop(),tipo=partes.pop();if(partes.length!==3||!CID.test(quem))return;let txt;try{txt=new TextDecoder().decode(p)}catch{txt=String(p)}aoReceber(tipo,quem,txt)});
 }).catch(()=>{if(!fechado)aoMudar('sem-biblioteca')});
 return {
  publicar(tipo,conteudo){if(jogador&&cliente&&cliente.connected)cliente.publish(topico(codigo,tipo,cid),conteudo,{qos:1,retain:true})},
  // apagar=true: tira desta sala tudo que esta pessoa deixou retido.
  fechar(apagar){fechado=true;if(!cliente)return;if(apagar&&jogador&&cliente.connected)['ficha','rolagens','online'].forEach(t=>cliente.publish(topico(codigo,t,cid),'',{qos:1,retain:true}));cliente.end(false)}
 }}

const TEXTO={fora:'Fora de sala',conectando:'Conectando…',conectado:'Ao vivo',reconectando:'Conexão caiu, tentando de novo…','sem-conexao':'Sem conexão. Tentando de novo…','sem-biblioteca':'Não consegui carregar a conexão. Confira a internet e recarregue a página.'};
return {SITE,MAX_ROLAGENS,TEXTO,novoCodigo,limparCodigo,meuCid,conectar,limparFicha,limparRolagens,ler};
})();
