export const PARTICLE_INTERVAL=5; // 9 before the 2026-10-30 redesign — shorter rest between flips
export const TURN_DURATION=1.6;
export const PARTICLE_STAGGER=0.55;
export const PARTICLE_WAVE_DURATION=3.3;
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function barAngles(elapsed,base=[0,0,0]){
  return base.map((angle,beam)=>angle+Math.PI*ease((elapsed-beam*PARTICLE_STAGGER)/TURN_DURATION));
}
// A travelling wave of shrink-and-turn exits, followed by grow-and-unwind
// entrances. The allocated clearance stays at the full glyph size throughout.
export function particleMotion(point,elapsed){
  if(elapsed===null||!Number.isFinite(elapsed)||elapsed>PARTICLE_WAVE_DURATION)return{scale:1,turn:0};
  const y=(point.localPosition[1]+22.5)/45;
  const jitter=((Math.sin(point.index*127.1+19.3)*43758.5453)%1+1)%1;
  const t=elapsed-point.beam*PARTICLE_STAGGER-y*0.65-jitter*0.1;
  const exit=0.24+point.size*0.055,hold=0.08,entrance=0.52+point.size*0.03;
  const direction=point.index%2?1:-1;
  if(t<=0)return{scale:1,turn:0};
  if(t<exit){const p=ease(t/exit);return{scale:1-p,turn:direction*p*0.7};}
  if(t<exit+hold)return{scale:0,turn:direction*0.7};
  const p=ease((t-exit-hold)/entrance);
  return{scale:p,turn:direction*(1-p)*0.7};
}
