// Start the slow camera revolution with the reveal, without a hold or ramp delay.
export function cameraOrbit(time,enabled=true){
 return enabled?Math.max(0,time)*.055:0;
}
