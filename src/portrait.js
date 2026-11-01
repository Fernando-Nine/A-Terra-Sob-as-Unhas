// Retratos são imagens JPEG pequenas incorporadas à ficha, sem URLs de terceiros.
window.ATSUPhoto=(()=>{'use strict';
const MAX=60000;
function clean(value){return typeof value==='string'&&value.length<=MAX&&/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(value)?value:''}
async function prepare(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Escolha uma imagem JPEG, PNG ou WebP.');
 if(file.size>10*1024*1024)throw Error('A imagem pode ter até 10 MB.');
 let bitmap;try{bitmap=await createImageBitmap(file,{resizeWidth:640,resizeQuality:'high',imageOrientation:'from-image'})}catch{throw Error('Não foi possível abrir esta imagem. Escolha outro arquivo.')}
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 try{
  let sw=bitmap.width,sh=bitmap.height;if(sw/sh>.8)sw=sh*.8;else sh=sw/.8;
  for(const width of [320,240,160]){
   canvas.width=width;canvas.height=width*1.25;ctx.fillStyle='#14221c';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,(bitmap.width-sw)/2,(bitmap.height-sh)/2,sw,sh,0,0,canvas.width,canvas.height);
   for(const quality of [.84,.7,.55,.4]){const data=canvas.toDataURL('image/jpeg',quality);if(clean(data))return data}
  }
  throw Error('Não foi possível reduzir esta foto. Escolha uma imagem menor.');
 }finally{bitmap.close();canvas.width=canvas.height=1}
}
return {clean,prepare};
})();
