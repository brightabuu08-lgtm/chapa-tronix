export type Vec3=[number,number,number];
export const SHOULDER:Vec3=[0,.96,-.72];
export const SOURCE:Vec3=[-1.62,.46,.54];
export const ROLLER_RADIUS=.048,ROLLER_CENTER_Y=.36,BOARD_THICKNESS=.035;
export const CONVEYOR_SPEED=.32,CONVEYOR_START=7.25;
export const DESTINATION:Vec3=[1.52,ROLLER_CENTER_Y+ROLLER_RADIUS+BOARD_THICKNESS/2,.62];
// One drive controls both the roller surface and the supported board (v = r * omega).
export const rollerAngle=(seconds:number)=>-seconds*CONVEYOR_SPEED/ROLLER_RADIUS;
export const UPPER_LENGTH=1.47,FOREARM_LENGTH=1.42,CYCLE_SECONDS=12;
export const add=(a:Vec3,b:Vec3):Vec3=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
export const sub=(a:Vec3,b:Vec3):Vec3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
export const mul=(a:Vec3,n:number):Vec3=>[a[0]*n,a[1]*n,a[2]*n];
export const length=(v:Vec3)=>Math.hypot(...v);
export const normalize=(v:Vec3):Vec3=>mul(v,1/(length(v)||1));
export const dot=(a:Vec3,b:Vec3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const cross=(a:Vec3,b:Vec3):Vec3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const lerp=(a:Vec3,b:Vec3,u:number):Vec3=>add(a,mul(sub(b,a),u));
const smooth=(u:number)=>{const t=Math.max(0,Math.min(1,u));return t*t*(3-2*t);};
export function solveArm(tcp:Vec3){
 const wrist=add(tcp,[0,.48,0]),delta=sub(wrist,SHOULDER),radial=Math.hypot(delta[0],delta[2]);
 const direction:Vec3=[delta[0]/radial,0,delta[2]/radial];
 const cosine=Math.max(-1,Math.min(1,(radial*radial+delta[1]*delta[1]-UPPER_LENGTH**2-FOREARM_LENGTH**2)/(2*UPPER_LENGTH*FOREARM_LENGTH)));
 const elbowAngle=-Math.acos(cosine),shoulderAngle=Math.atan2(delta[1],radial)-Math.atan2(FOREARM_LENGTH*Math.sin(elbowAngle),UPPER_LENGTH+FOREARM_LENGTH*Math.cos(elbowAngle));
 const elbow=add(SHOULDER,add(mul(direction,UPPER_LENGTH*Math.cos(shoulderAngle)),[0,UPPER_LENGTH*Math.sin(shoulderAngle),0]));
 return {elbow,wrist,axis:normalize(cross(direction,[0,1,0]))};
}
export function robotPose(seconds:number){
 const t=((seconds%CYCLE_SECONDS)+CYCLE_SECONDS)%CYCLE_SECONDS,highSource=add(SOURCE,[0,1.03,0]),highDestination=add(DESTINATION,[0,1.03,0]);
 let tcp:Vec3=highSource;
 if(t<1.6)tcp=lerp(highSource,SOURCE,smooth(t/1.6));
 else if(t<2.25)tcp=SOURCE;
 else if(t<3.5)tcp=lerp(SOURCE,highSource,smooth((t-2.25)/1.25));
 else if(t<5.35){const u=smooth((t-3.5)/1.85);tcp=add(lerp(highSource,highDestination,u),[0,.23*Math.sin(Math.PI*u),0]);}
 else if(t<6.7)tcp=lerp(highDestination,DESTINATION,smooth((t-5.35)/1.35));
 else if(t<7.25)tcp=DESTINATION;
 else if(t<8.45)tcp=lerp(DESTINATION,highDestination,smooth((t-7.25)/1.2));
 else if(t<10.5){const u=smooth((t-8.45)/2.05);tcp=add(lerp(highDestination,highSource,u),[0,.23*Math.sin(Math.PI*u),0]);}
 const held=t>=2.15&&t<6.9;
 const grip=t<1.65?0:t<2.15?smooth((t-1.65)/.5):t<6.9?1:t<7.25?1-smooth((t-6.9)/.35):0;
 let board:Vec3|null=t<2.15?SOURCE:held?tcp:t<10?add(DESTINATION,[CONVEYOR_SPEED*Math.max(0,t-CONVEYOR_START),0,0]):null;
 if(t>=10.8)board=SOURCE;
 return {tcp,board,grip,held,...solveArm(tcp)};
}
