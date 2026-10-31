import {PARTICLE_INTERVAL,barAngles} from './orbit-choreography.js';
export const FIELD_REST=0,LIGHT_START=0,LIGHT_DURATION=2.6;
export const TRANSITION=.5,INTRO_HOLD=LIGHT_START+LIGHT_DURATION,ROTATION_START=INTRO_HOLD+TRANSITION;
export function rotationTiming(seconds){
 const elapsed=Math.max(0,seconds-ROTATION_START),turn=Math.floor(elapsed/PARTICLE_INTERVAL),within=elapsed%PARTICLE_INTERVAL;
 return {barTurns:seconds<ROTATION_START?[0,0,0]:barAngles(within,[turn*Math.PI,turn*Math.PI,turn*Math.PI]),particleElapsed:seconds<ROTATION_START?null:within,time:seconds,startedTurns:seconds<ROTATION_START?0:turn+1};
}
export function timeline(seconds){
 // Reveal once. Subsequent turns continue without returning to the unformed field.
 const rotation=rotationTiming(seconds);
 let progress=1,phase='ACubic blocks';
 if(seconds<INTRO_HOLD){progress=0;phase='Square field';}
 else if(seconds<INTRO_HOLD+TRANSITION){progress=(seconds-INTRO_HOLD)/TRANSITION;phase='Forming the blocks';}
 const fieldElapsed=seconds;
 if(phase==='Square field'&&fieldElapsed>=LIGHT_START)phase=fieldElapsed>=LIGHT_START+LIGHT_DURATION?'Logo in light':'Revealing the logo in light';
 return {...rotation,progress,phase,fieldElapsed};
}
