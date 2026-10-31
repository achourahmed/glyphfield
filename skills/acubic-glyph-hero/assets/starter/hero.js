import {FIELD_ROWS} from './square-to-bars-model.js';

export function mountGlyphHero(art){
 const canvas=art.querySelector('canvas'),preference=matchMedia('(prefers-reduced-motion: reduce)');
 let worker=null,disposed=false,failed=false,sizeKey='';
 const post=message=>{if(worker&&!disposed&&!failed)worker.postMessage(message);};
 function fallback(error){
  failed=true;art.classList.remove('ready');worker?.terminate();worker=null;
  if(error)console.warn('Glyph hero: using static fallback.',error.message||error);
 }
 function resize(){
  if(disposed||failed)return;
  const r=art.getBoundingClientRect();if(!r.width||!r.height)return;
  const width=r.width,height=r.height,extend=Math.max(0,-parseFloat(getComputedStyle(art).marginLeft)||0);
  const topExtension=Math.max(0,Number(art.dataset.topExtension)||0);
  const dpr=Math.min(2,Math.max(1.5,devicePixelRatio||1));
  const key=[width,height,extend,topExtension,dpr].join(':');if(key===sizeKey)return;sizeKey=key;
  art.style.setProperty('--field-top',topExtension+'px');
  post({type:'resize',width,height,extend,topExtension,dpr,extraRows:Math.ceil(topExtension/(height/FIELD_ROWS))});
 }
 const onMotion=()=>post({type:'reduced',reduced:preference.matches});
 const onVisible=()=>post({type:'visible',visible:!document.hidden});
 const onTheme=()=>post({type:'theme',light:document.documentElement.dataset.theme==='light'});
 const sizes=new ResizeObserver(resize);
 const visibility=new IntersectionObserver(entries=>post({type:'inview',inView:entries[0].isIntersecting}),{rootMargin:'60px'});
 const themes=new MutationObserver(onTheme);
 try{
  if(typeof canvas.transferControlToOffscreen!=='function')throw new Error('OffscreenCanvas unavailable');
  worker=new Worker(new URL('./hero-worker.js',import.meta.url),{type:'module'});
  worker.addEventListener('error',fallback);
  worker.addEventListener('message',({data})=>{if(data.type==='ready')art.classList.add('ready');});
  const offscreen=canvas.transferControlToOffscreen();
  worker.postMessage({type:'init',canvas:offscreen,playing:!preference.matches,reduced:preference.matches,light:document.documentElement.dataset.theme==='light'},[offscreen]);
  sizes.observe(art);visibility.observe(art);
  themes.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  preference.addEventListener('change',onMotion);document.addEventListener('visibilitychange',onVisible);
  window.addEventListener('resize',resize);document.fonts.ready.then(resize);
  onVisible();resize();
 }catch(error){fallback(error);}
 return()=>{
  disposed=true;worker?.terminate();worker=null;
  sizes.disconnect();visibility.disconnect();themes.disconnect();
  preference.removeEventListener('change',onMotion);document.removeEventListener('visibilitychange',onVisible);
  window.removeEventListener('resize',resize);art.classList.remove('ready');
 };
}
