// Efeitos visuais: não alteram dados, sorteios ou mensagens da sala.
window.ATSUFX=(()=>{'use strict';
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),active=new Set(),byElement=new WeakMap(),seen=new WeakSet(),observed=new Set();
let enabled=true,observer;
try{enabled=localStorage.getItem('atsu.motion')!=='off'}catch{}
const allowed=()=>enabled&&!reduced.matches&&!document.hidden;
function animate(node,frames,options={}){
 if(!node||!allowed()||!node.animate)return;
 const previous=byElement.get(node);if(previous)previous.cancel();
 const animation=node.animate(frames,{duration:420,easing:'cubic-bezier(.2,.75,.25,1)',...options});
 active.add(animation);byElement.set(node,animation);
 animation.finished.catch(()=>{}).finally(()=>{active.delete(animation);if(byElement.get(node)===animation)byElement.delete(node)});
 return animation;
}
function appear(node,index=0){animate(node,[{opacity:.25,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],{duration:460,delay:Math.min(index,3)*55})}
function scan(root){if(!root||!observer||!allowed())return;for(const node of observed)if(!node.isConnected){observer.unobserve(node);observed.delete(node)}root.querySelectorAll('.panel,.home-steps article,.home-facts>div,.home-bottom,.journal-entry,.rules-formula').forEach(node=>{if(!seen.has(node)){observer.observe(node);observed.add(node)}})}
function section(root){if(!root)return;animate(root,[{opacity:.5,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:280});scan(root)}
function pulse(node){animate(node,[{boxShadow:'0 0 0 0 #e4c58155'},{boxShadow:'0 0 0 12px #e4c58100'}],{duration:560})}
function roll(nodes,result,critical=false){
 nodes.forEach((node,i)=>animate(node,[{transform:'rotate(0deg) translateY(0)'},{transform:'rotate(-16deg) translateY(-12px)',offset:.28},{transform:'rotate(12deg) translateY(-4px)',offset:.6},{transform:'rotate(0deg) translateY(0)'}],{duration:440+i*65}));
 pulse(result);if(critical&&result)result.classList.add('result-highlight');
}
function update(){
 const on=enabled&&!reduced.matches;document.documentElement.dataset.motion=on?'on':'off';
 document.querySelectorAll('[data-motion-toggle]').forEach(button=>{button.setAttribute('aria-pressed',String(on));button.setAttribute('aria-label',on?'Desativar animações':'Ativar animações');button.title=reduced.matches?'Movimentos reduzidos nas preferências do aparelho':on?'Desativar animações':'Ativar animações';button.disabled=reduced.matches});
 if(!on){active.forEach(a=>a.cancel());document.querySelectorAll('.fx-ripple').forEach(n=>n.remove());observer?.disconnect();observed.clear()}
 else scan(document.querySelector('.tabview:not([hidden])'));
}
function start(){
 if('IntersectionObserver' in window)observer=new IntersectionObserver(entries=>{entries.forEach((entry,index)=>{if(!entry.isIntersecting)return;observer.unobserve(entry.target);observed.delete(entry.target);if(seen.has(entry.target))return;seen.add(entry.target);appear(entry.target,index)})},{threshold:.08});
 document.querySelectorAll('[data-motion-toggle]').forEach(button=>button.addEventListener('click',()=>{enabled=!enabled;try{localStorage.setItem('atsu.motion',enabled?'on':'off')}catch{}update()}));
 document.addEventListener('click',event=>{
  const button=event.target.closest('button,.btn');if(!button||button.disabled||button.classList.contains('board-handle')||button.hasAttribute('data-motion-toggle')||!button.animate||!allowed())return;
  const rect=button.getBoundingClientRect(),size=Math.max(rect.width,rect.height)*2,ripple=document.createElement('span');ripple.className='fx-ripple';ripple.setAttribute('aria-hidden','true');ripple.style.width=ripple.style.height=size+'px';
  ripple.style.left=(event.detail?event.clientX-rect.left:rect.width/2)-size/2+'px';ripple.style.top=(event.detail?event.clientY-rect.top:rect.height/2)-size/2+'px';button.classList.add('fx-button');button.append(ripple);
  const effect=ripple.animate([{transform:'scale(0)',opacity:.24},{transform:'scale(1)',opacity:0}],{duration:520,easing:'ease-out'});active.add(effect);effect.finished.catch(()=>{}).finally(()=>{ripple.remove();active.delete(effect)});
 },true);
 document.addEventListener('visibilitychange',()=>{document.documentElement.dataset.effectsPaused=String(document.hidden);if(document.hidden)active.forEach(a=>a.cancel())});
 reduced.addEventListener('change',update);update();section(document.querySelector('.auth-card'));
}
window.addEventListener('DOMContentLoaded',start);
return {appear,scan,section,pulse,roll};
})();
