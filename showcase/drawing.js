import {extrudeContours} from './engine/contour-mesh.js';
import {autoThreshold,hasTransparency,thresholdImage,smoothLoops,simplifyLoop} from './engine/image-shape.js';
import {galleryForm} from './engine/field-sculptures.js';

export function installDrawing({apply}){
 const $=id=>document.getElementById(id),dialog=$('draw-dialog'),pad=$('draw-pad'),status=$('draw-status');
 const clone=value=>JSON.parse(JSON.stringify(value));
 let contours=[],selected=null,active=0,mode='freehand',pointer=null,history=[],future=[],mesh=null,saved=null,initialized=false;
 let image=null,imageURL=null,imageSerial=0,processing=0,previewFrame=0,previewTime=0,lastFrame=0,previewSpin=!matchMedia('(prefers-reduced-motion: reduce)').matches;
 let keyboard=[.5,.375],previewDrag=null,dirty=true;
 const defaults={depth:45,size:100,speed:100,yaw:29,tilt:18};
 const controls=Object.keys(defaults).map(key=>[key,$('draw-'+key)]);
 const values=()=>Object.fromEntries(controls.map(([key,el])=>[key,Number(el.value)]));
 const options=()=>{const v=values();return {scale:v.size/100,speed:v.speed/100,yaw:v.yaw*Math.PI/180,tilt:v.tilt*Math.PI/180};};
 function checkpoint(){history.push({contours:clone(contours),values:values()});if(history.length>40)history.shift();future=[];}
 function restore(s){contours=clone(s.contours);for(const [key,el] of controls)el.value=s.values[key];selected=null;active=Math.max(0,contours.length-1);render();}
 function say(text){status.textContent=text;}
 try{saved=JSON.parse(localStorage.getItem('glyphfield-drawing-v2')||localStorage.getItem('glyphfield-drawing-v1'));if(saved){saved.contours=saved.contours||[saved.points];extrudeContours(saved.contours,saved.depth);}}catch{saved=null;}
 const path=loop=>loop.length?'M'+loop.map(p=>`${(p[0]*400).toFixed(2)} ${(p[1]*400).toFixed(2)}`).join(' L'):'';
 function updateLabels(){
  for(const [key,el] of controls){const v=Number(el.value);$('draw-'+key+'-value').textContent=key==='speed'?(v/100).toFixed(2).replace(/0$/,'')+'×':v+(key==='yaw'||key==='tilt'?'°':'%');el.style.setProperty('--fill',(v-Number(el.min))/(Number(el.max)-Number(el.min))*100+'%');}
  for(const key of ['threshold','smoothing','cleanup']){const el=$('image-'+key);$('image-'+key+'-value').textContent=el.value+(key==='cleanup'?' px':'');el.style.setProperty('--fill',(Number(el.value)-Number(el.min))/(Number(el.max)-Number(el.min))*100+'%');}
 }
 function render(validate=true){
  $('draw-line').setAttribute('d',contours.map(p=>path(p)+(p.length>2?' Z':'')).join(' '));
  $('draw-fill').setAttribute('d',contours.filter(p=>p.length>2).map(p=>path(p)+' Z').join(' '));
  $('draw-empty').style.display=contours.some(p=>p.length)?'none':'';
  $('image-reference').style.display=mode==='image'&&$('image-show').checked&&image?'':'none';
  const dots=$('draw-points');dots.replaceChildren();
  if(mode==='corners')contours.forEach((loop,r)=>loop.forEach((p,i)=>{
   const c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('cx',p[0]*400);c.setAttribute('cy',p[1]*400);c.setAttribute('r',selected&&selected[0]===r&&selected[1]===i?'4':'2.6');if(selected&&selected[0]===r&&selected[1]===i)c.classList.add('selected');dots.append(c);
  }));
  $('draw-undo').disabled=!history.length;$('draw-redo').disabled=!future.length;$('draw-clear').disabled=!contours.length;$('draw-delete').disabled=!selected;
  for(const id of ['draw-fit','draw-rotate','draw-flip','draw-smooth'])$(id).disabled=!contours.length;
  updateLabels();
  if(validate){try{mesh=extrudeContours(contours,Number($('draw-depth').value)/100);$('draw-create').disabled=false;say(`${contours.length} outline${contours.length===1?'':'s'} · ${contours.reduce((n,p)=>n+p.length,0)} points. Ready to create.`);}catch(error){mesh=null;$('draw-create').disabled=true;say(contours.length?error.message:'Start with a preset, a sketch, or an image.');}}
  dirty=true;
 }
 function setMode(next){mode=next;for(const key of ['freehand','corners','image'])$('mode-'+key).setAttribute('aria-pressed',String(key===mode));$('image-settings').hidden=mode!=='image';
  $('draw-help').textContent=mode==='freehand'?'Drag to sketch. Each stroke replaces the outline.':mode==='corners'?'Drag points. Click an edge to insert; Delete removes the selected point.':'Adjust the silhouette below, then use Edit points to refine it.';render(false);
 }
 for(const key of ['freehand','corners','image'])$('mode-'+key).onclick=()=>setMode(key);
 function coords(event){const r=pad.getBoundingClientRect();let p=[(event.clientX-r.left)/r.width,(event.clientY-r.top)/r.height*.75];if($('draw-snap').checked)p=p.map(v=>Math.round((v-.025)/.05)*.05+.025);return p.map((v,i)=>Math.max(.01,Math.min(i===0?.99:.74,v)));}
 function nearEdge(p){let best=null,min=.018;contours.forEach((ring,r)=>ring.forEach((a,i)=>{const b=ring[(i+1)%ring.length],dx=b[0]-a[0],dy=b[1]-a[1],len=dx*dx+dy*dy,t=len?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/len)):0,q=[a[0]+t*dx,a[1]+t*dy],d=Math.hypot(p[0]-q[0],p[1]-q[1]);if(d<min){min=d;best=[r,i+1,q];}}));return best;}
 pad.onpointerdown=event=>{
  if(event.button!==0||pointer!==null||mode==='image')return;event.preventDefault();pad.focus();pad.classList.remove('keyboard');pointer=event.pointerId;pad.setPointerCapture(pointer);checkpoint();const p=coords(event);keyboard=[...p];
  if(mode==='freehand'){contours=[[p]];active=0;selected=null;}
  else{
   selected=null;let min=.025;contours.forEach((loop,r)=>loop.forEach((q,i)=>{const d=Math.hypot(p[0]-q[0],p[1]-q[1]);if(d<min){min=d;selected=[r,i];}}));
   if(!selected){const edge=nearEdge(p);if(edge){contours[edge[0]].splice(edge[1],0,edge[2]);selected=edge.slice(0,2);}else{if(!contours[active]){active=contours.length;contours.push([]);}contours[active].push(p);selected=[active,contours[active].length-1];}}active=selected[0];
  }render(false);
 };
 pad.onpointermove=event=>{if(event.pointerId!==pointer)return;const p=coords(event);if(mode==='freehand'){const loop=contours[active];if(loop.length<1500&&Math.hypot(p[0]-loop.at(-1)[0],p[1]-loop.at(-1)[1])>.004)loop.push(p);}else if(selected)contours[selected[0]][selected[1]]=p;render(false);};
 const finish=event=>{if(event.pointerId!==pointer)return;pointer=null;if(pad.hasPointerCapture(event.pointerId))pad.releasePointerCapture(event.pointerId);if(mode==='freehand'&&contours[active]?.length>3)contours[active]=simplifyLoop(contours[active],.003);render();};
 pad.onpointerup=finish;pad.onpointercancel=finish;pad.onlostpointercapture=()=>{if(pointer!==null){pointer=null;render();}};
 function undo(){clearTimeout(processing);if(history.length){future.push({contours:clone(contours),values:values()});restore(history.pop());}}
 function redo(){clearTimeout(processing);if(future.length){history.push({contours:clone(contours),values:values()});restore(future.pop());}}
 function deletePoint(){if(!selected)return;checkpoint();const [r,i]=selected;contours[r].splice(i,1);if(contours[r].length<3)contours.splice(r,1);selected=null;active=Math.max(0,contours.length-1);render();}
 $('draw-undo').onclick=undo;$('draw-redo').onclick=redo;$('draw-delete').onclick=deletePoint;
 dialog.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!['INPUT','SELECT'].includes(e.target.tagName)){e.preventDefault();e.shiftKey?redo():undo();}});
 pad.onkeydown=e=>{
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Delete','Backspace','Enter'].includes(e.key))return;e.preventDefault();pad.classList.add('keyboard');
  if(e.key==='Delete'||e.key==='Backspace'){deletePoint();return;}if(e.key==='Enter'){if(!$('draw-create').disabled)$('draw-create').click();return;}
  const step=e.shiftKey?.025:.005,p=selected?contours[selected[0]][selected[1]]:keyboard;if(selected)checkpoint();
  if(e.key==='ArrowLeft')p[0]-=step;if(e.key==='ArrowRight')p[0]+=step;if(e.key==='ArrowUp')p[1]-=step;if(e.key==='ArrowDown')p[1]+=step;p[0]=Math.max(.01,Math.min(.99,p[0]));p[1]=Math.max(.01,Math.min(.74,p[1]));
  if(e.key===' '){checkpoint();if(!contours[active]){active=contours.length;contours.push([]);}contours[active].push([...keyboard]);}
  $('draw-cursor').setAttribute('cx',keyboard[0]*400);$('draw-cursor').setAttribute('cy',keyboard[1]*400);render();
 };
 function fit(loops){const all=loops.flat();if(!all.length)return loops;const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2,scale=Math.min(.78/Math.max(.01,Math.max(...xs)-Math.min(...xs)),.55/Math.max(.01,Math.max(...ys)-Math.min(...ys)));return loops.map(p=>p.map(([x,y])=>[(x-cx)*scale+.5,(y-cy)*scale+.375]));}
 function change(fn){clearTimeout(processing);checkpoint();contours=fn(contours);selected=null;render();}
 $('draw-clear').onclick=()=>change(()=>[]);
 $('draw-fit').onclick=()=>change(fit);
 $('draw-rotate').onclick=()=>change(loops=>fit(loops.map(p=>p.map(([x,y])=>[-y,x]))));
 $('draw-flip').onclick=()=>change(loops=>loops.map(p=>p.map(([x,y])=>[1-x,y])));
 $('draw-smooth').onclick=()=>change(loops=>smoothLoops(loops,1));
 $('draw-add-loop').onclick=()=>{checkpoint();contours.push([]);active=contours.length-1;selected=null;setMode('corners');say('Click inside an existing outline for a hole, or outside for a separate part.');};
 const circle=(radius,n=48)=>Array.from({length:n},(_,i)=>[.5+radius*Math.cos(i*2*Math.PI/n),.375+radius*Math.sin(i*2*Math.PI/n)]);
 $('draw-preset').onchange=e=>{
  const name=e.target.value;if(!name)return;
  const presets={rectangle:[[[.2,.15],[.8,.15],[.8,.6],[.2,.6]]],circle:[circle(.26)],triangle:[[[.5,.1],[.8,.63],[.2,.63]]],ring:[circle(.27),circle(.14)],star:[Array.from({length:10},(_,i)=>{const r=i%2?.12:.28,a=-Math.PI/2+i*Math.PI/5;return [.5+r*Math.cos(a),.375+r*Math.sin(a)];})],arrow:[[[.15,.29],[.57,.29],[.57,.12],[.88,.375],[.57,.63],[.57,.46],[.15,.46]]]};
  change(()=>presets[name]);active=0;setMode('corners');e.target.value='';
 };
 for(const [key,el] of controls){el.onpointerdown=()=>checkpoint();el.onkeydown=e=>{if(e.key.startsWith('Arrow'))checkpoint();};el.oninput=()=>{previewTime=0;render(key==='depth');};}
 $('draw-reset-view').onclick=()=>{checkpoint();for(const key of ['size','speed','yaw','tilt'])$('draw-'+key).value=defaults[key];previewTime=0;render(false);};
 function processImage(){
  if(!image)return;updateLabels();
  try{
   const result=thresholdImage(image,{threshold:Number($('image-threshold').value),channel:$('image-channel').value,invert:$('image-invert').checked,cleanup:Number($('image-cleanup').value),smoothing:Number($('image-smoothing').value),keepHoles:$('image-holes').checked,largest:$('image-largest').checked});
   const factor=Math.min(1/image.width,.75/image.height),w=image.width*factor,h=image.height*factor;
   contours=result.contours.map(p=>p.map(([x,y])=>[(x-.5)*w+.5,(y/.75-.5)*h+.375]));active=0;selected=null;render();
  }catch(error){contours=[];render();say(error.message);}
 }
 function scheduleImage(){$('draw-create').disabled=true;say('Updating silhouette…');clearTimeout(processing);processing=setTimeout(processImage,90);updateLabels();}
 for(const id of ['image-threshold','image-smoothing','image-cleanup']){$(id).onpointerdown=checkpoint;$(id).oninput=scheduleImage;}
 for(const id of ['image-channel','image-invert','image-holes','image-largest'])$(id).onchange=()=>{checkpoint();processImage();};
 $('image-show').onchange=()=>render(false);
 $('image-auto').onclick=()=>{if(image){checkpoint();$('image-threshold').value=autoThreshold(image.data,$('image-channel').value);processImage();}};
 async function loadImage(file){
  if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)){say('Choose a PNG, JPEG, or WebP image.');return;}if(file.size>12*1024*1024){say('Choose an image smaller than 12 MB.');return;}
  const serial=++imageSerial;say('Reading image…');let bitmap;
  try{
   bitmap=await createImageBitmap(file);if(serial!==imageSerial)return;
   if(bitmap.width*bitmap.height>32000000)throw Error('This image is too large. Resize it below 32 megapixels.');
   const scale=Math.min(1,256/bitmap.width,192/bitmap.height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);const next=ctx.getImageData(0,0,canvas.width,canvas.height);
   checkpoint();image=next;if(imageURL)URL.revokeObjectURL(imageURL);imageURL=URL.createObjectURL(file);$('image-reference').setAttribute('href',imageURL);$('image-name').textContent=file.name;
   $('image-channel').value=hasTransparency(image.data)?'alpha':'luminance';$('image-invert').checked=false;$('image-threshold').value=autoThreshold(image.data,$('image-channel').value);setMode('image');processImage();
  }catch(error){say(error.message||'This image could not be read. Try a PNG or JPEG.');}finally{bitmap?.close();$('image-file').value='';}
 }
 $('image-open').onclick=()=>$('image-file').click();$('image-file').onchange=e=>loadImage(e.target.files[0]);
 pad.addEventListener('dragover',e=>{e.preventDefault();pad.classList.add('drop-ready');});pad.addEventListener('dragleave',()=>pad.classList.remove('drop-ready'));
 pad.addEventListener('drop',e=>{e.preventDefault();pad.classList.remove('drop-ready');loadImage(e.dataTransfer.files[0]);});
 const preview=$('draw-preview'),ctx=preview.getContext('2d');
 function paint(now){
  previewFrame=0;if(!dialog.open)return;const dt=lastFrame?Math.min(.05,(now-lastFrame)/1000):0;lastFrame=now;if(previewSpin&&!previewDrag)previewTime+=dt;
  if(dirty||(previewSpin&&Number($('draw-speed').value)>0)){
   dirty=false;const light=document.documentElement.dataset.theme==='light';ctx.clearRect(0,0,520,360);
   if(mesh){const faces=galleryForm('custom',previewTime,520,360,mesh,options())[0].faces;
    for(const face of [...faces].reverse()){const ink=Math.round(light?205-face.tone*65:85+face.tone*140);ctx.fillStyle=`rgb(${ink},${ink},${ink+2})`;ctx.beginPath();face.corners.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();}
   }else{ctx.fillStyle=light?'#88888e':'#77777d';ctx.font='22px sans-serif';ctx.textAlign='center';ctx.fillText('Your form appears here',260,185);}
  }previewFrame=requestAnimationFrame(paint);
 }
 $('preview-spin').textContent=previewSpin?'Pause':'Play';$('preview-spin').setAttribute('aria-pressed',String(previewSpin));
 $('preview-spin').onclick=()=>{previewSpin=!previewSpin;$('preview-spin').textContent=previewSpin?'Pause':'Play';$('preview-spin').setAttribute('aria-pressed',String(previewSpin));};
 preview.onpointerdown=e=>{if(e.button!==0)return;previewDrag={x:e.clientX,y:e.clientY,yaw:Number($('draw-yaw').value)+previewTime*.18*Number($('draw-speed').value)/100*180/Math.PI,tilt:Number($('draw-tilt').value)};checkpoint();previewTime=0;preview.setPointerCapture(e.pointerId);};
 preview.onpointermove=e=>{if(!previewDrag)return;$('draw-yaw').value=((previewDrag.yaw+(e.clientX-previewDrag.x)*.65+540)%360)-180;$('draw-tilt').value=Math.max(-70,Math.min(70,previewDrag.tilt+(e.clientY-previewDrag.y)*.5));render(false);};
 preview.onpointerup=preview.onpointercancel=preview.onlostpointercapture=()=>{previewDrag=null;};
 $('draw-open').onclick=()=>{
  if(!initialized){if(saved){mode='corners';contours=clone(saved.contours);$('draw-depth').value=Math.round(saved.depth*100);for(const [key,factor] of [['size',100],['speed',100],['yaw',180/Math.PI],['tilt',180/Math.PI]]){const source=key==='size'?'scale':key;if(Number.isFinite(saved.options?.[source]))$('draw-'+key).value=saved.options[source]*factor;}}initialized=true;}
  dialog.showModal();setMode(mode);render();$('draw-title').focus();lastFrame=0;if(!previewFrame)previewFrame=requestAnimationFrame(paint);
 };
 $('draw-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{cancelAnimationFrame(previewFrame);previewFrame=0;lastFrame=0;});
 $('draw-create').onclick=()=>{try{const amount=Number($('draw-depth').value)/100;extrudeContours(contours,amount);saved={contours:clone(contours),depth:amount,options:options()};try{localStorage.setItem('glyphfield-drawing-v2',JSON.stringify(saved));}catch{}apply({...saved,mesh:extrudeContours(saved.contours,amount)},true);dialog.close();}catch(error){say(error.message);}};
 if(saved)apply({...saved,mesh:extrudeContours(saved.contours,saved.depth)},false);render();
}
