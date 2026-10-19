import {transform,multiply,type Matrix} from './geometry';
import {add,mul,sub,length,normalize,cross,SHOULDER,robotPose,ROLLER_RADIUS,ROLLER_CENTER_Y,rollerAngle,type Vec3} from './motion';
export type Part={mesh:'box'|'cylinder'|'casting';matrix:Matrix;color:Vec3;shine:number};
const color=(hex:string):Vec3=>[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255) as Vec3;
const paint=color('e4e0d5'),armPaint=color('cf7937'),steel=color('889da0'),dark=color('263539'),rubber=color('141e22'),copper=color('b9724c'),green=color('237568'),gold=color('c49e5d');
function builder(parts:Part[]){
 const box=(p:Vec3,size:Vec3,c:Vec3,shine=.25)=>parts.push({mesh:'box',matrix:transform(p,size),color:c,shine});
 const cylinder=(p:Vec3,r:number,h:number,c:Vec3,axis:Vec3=[0,1,0],shine=.6)=>parts.push({mesh:'cylinder',matrix:transform(p,[r,h,r],axis),color:c,shine});
 const bar=(a:Vec3,b:Vec3,r:number,c:Vec3)=>cylinder(mul(add(a,b),.5),r,length(sub(b,a)),c,sub(b,a));
 const casting=(a:Vec3,b:Vec3,r:number,c:Vec3)=>parts.push({mesh:'casting',matrix:transform(mul(add(a,b),.5),[r,length(sub(b,a)),r],sub(b,a)),color:c,shine:.45});
 return {box,cylinder,bar,casting};
}
export function staticWorkcell(){
 const parts:Part[]=[],{box,cylinder}=builder(parts);
 box([0,-.15,0],[60,.15,60],color('183044'),.02);
 box([0,0,0],[5.9,.18,3.6],color('b7c1bd'),.1);
 box([0,.1,0],[5.83,.04,3.53],color('d8dcd4'),.15);
 for(const x of [-2.68,2.68])for(const z of [-1.52,1.52])cylinder([x,.135,z],.045,.015,dark);
 box([0,.18,-.72],[.94,.14,.94],dark,.4);
 for(const x of [-.37,.37])for(const z of [-1.09,-.35])cylinder([x,.26,z],.045,.05,steel);
 cylinder([0,.35,-.72],.37,.32,paint);cylinder([0,.51,-.72],.32,.065,dark);
 cylinder([0,.65,-.72],.29,.23,paint);cylinder([0,.79,-.72],.255,.06,copper);
 box([-1.62,.23,.54],[.85,.21,.72],dark,.3);box([-1.62,.35,.54],[.8,.035,.66],steel);
 for(const x of [-1.94,-1.30])box([x,.405,.54],[.04,.08,.54],rubber);
 box([-1.62,.373,.54],[.52,.045,.38],rubber);
 box([-2.12,.3,.08],[.15,.29,.15],dark);cylinder([-2.12,.455,.08],.04,.025,green);
 box([1.65,.235,.62],[2.1,.19,.76],dark,.3);
 box([1.65,.34,.62],[2.02,.03,.64],rubber,.1);
 for(const z of [.22,1.02])box([1.65,.37,z],[2.14,.09,.045],steel,.85);
 for(const x of [.68,2.62])box([x,.30,.62],[.045,.09,.71],dark);
 // Engraved mounting slots, not luminous paths.
 for(let i=0;i<6;i++)box([-.45+i*.18,.126,1.4],[.08,.004,.014],color('8b9c98'),.1);
 return parts;
}
export function movingWorkcell(seconds:number){
 const pose=robotPose(seconds),parts:Part[]=[],{box,cylinder,bar,casting}=builder(parts),axis=pose.axis;
 // Rotate the cylinders and their inset traction strips, including while the arm is picking up.
 const angle=rollerAngle(seconds),c=Math.cos(angle),s=Math.sin(angle);
 const rotation=new Float32Array([c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1]);
 for(let i=0;i<11;i++){
  const center:Vec3=[.7+i*.19,ROLLER_CENTER_Y,.62];
  const place=(offset:Vec3)=>transform(add(center,offset),[1,1,1]);
  parts.push({mesh:'cylinder',matrix:multiply(place([0,0,0]),multiply(rotation,transform([0,0,0],[ROLLER_RADIUS,.66,ROLLER_RADIUS],[0,0,1]))),color:steel,shine:.8});
  for(let stripe=0;stripe<4;stripe++){
   const a=angle+stripe*Math.PI/2,ca=Math.cos(a),sa=Math.sin(a);
   const spin=new Float32Array([ca,sa,0,0,-sa,ca,0,0,0,0,1,0,0,0,0,1]);
   parts.push({mesh:'box',matrix:multiply(place([ca*(ROLLER_RADIUS-.001),sa*(ROLLER_RADIUS-.001),0]),multiply(spin,transform([0,0,0],[.002,.012,.61]))),color:dark,shine:.25});
  }
 }
 const joint=(center:Vec3,r:number)=>{
  cylinder(center,r,.29,dark,axis,.5);
  for(const sign of [-1,1]){
   cylinder(add(center,mul(axis,sign*.158)),r*.91,.035,paint,axis,.6);
   cylinder(add(center,mul(axis,sign*.18)),r*.65,.025,copper,axis,.5);
   const u=normalize(cross(axis,[0,1,0])),v=cross(axis,u);
   for(let i=0;i<6;i++){const angle=i*Math.PI/3,offset=add(mul(u,Math.cos(angle)*r*.77),mul(v,Math.sin(angle)*r*.77));cylinder(add(add(center,offset),mul(axis,sign*.184)),.018,.015,dark,axis,.8);}
  }
 };
 casting(SHOULDER,pose.elbow,.29,armPaint);bar(add(SHOULDER,mul(axis,-.18)),add(pose.elbow,mul(axis,-.18)),.065,steel);
 casting(pose.elbow,pose.wrist,.205,armPaint);
 joint(SHOULDER,.245);joint(pose.elbow,.205);joint(pose.wrist,.15);
 bar([0,.78,-.72],SHOULDER,.21,paint);
 // Cable follows the same shoulder and elbow as the mechanical links.
 const cablePoints=[add(SHOULDER,mul(axis,.25)),add(pose.elbow,add(mul(axis,.25),[0,.18,0])),add(pose.wrist,mul(axis,.22))];
 for(let i=0;i<16;i++){const point=(t:number):Vec3=>add(add(mul(cablePoints[0],(1-t)**2),mul(cablePoints[1],2*(1-t)*t)),mul(cablePoints[2],t*t));bar(point(i/16),point((i+1)/16),.025,rubber);}
 const tcp=pose.tcp;
 cylinder(add(tcp,[0,.36,0]),.09,.24,steel);cylinder(add(tcp,[0,.245,0]),.12,.065,dark);
 box(add(tcp,[0,.2,0]),[.6,.11,.23],steel,.75);
 const gap=.375-.108*pose.grip;
 for(const sign of [-1,1]){box(add(tcp,[sign*gap,.105,0]),[.065,.2,.18],dark,.45);box(add(tcp,[sign*(gap-.026),.01,0]),[.022,.075,.16],rubber,.05);}
 if(pose.board){
  const p=pose.board;box(p,[.48,.035,.34],green,.3);box(add(p,[0,.035,0]),[.17,.035,.14],dark,.3);
  box(add(p,[-.17,.045,0]),[.1,.07,.11],steel,.8);
  for(const z of [-.13,.13]){box(add(p,[.03,.028,z]),[.29,.035,.04],rubber);for(let i=0;i<6;i++)box(add(p,[-.09+i*.046,.055,z]),[.012,.03,.012],gold,.8);}
 }
 return parts;
}
