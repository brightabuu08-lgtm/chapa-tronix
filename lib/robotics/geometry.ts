import {cross,normalize,sub,dot,type Vec3} from './motion';
export type Matrix=Float32Array;
export const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
export function multiply(a:Matrix,b:Matrix){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
export function lookAt(eye:Vec3,target:Vec3){const z=normalize(sub(eye,target)),x=normalize(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
export function perspective(aspect:number){const f=1/Math.tan(32*Math.PI/360),near=.1,far=40;return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);}
export function ortho(){const l=-4.5,r=4.5,b=-4,t=4,n=.1,f=18;return new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]);}
export function transform(position:Vec3,scale:Vec3,axis:Vec3=[0,1,0]){const y=normalize(axis),x=normalize(cross(Math.abs(y[1])>.95?[0,0,1]:[0,1,0],y)),z=cross(x,y);return new Float32Array([x[0]*scale[0],x[1]*scale[0],x[2]*scale[0],0,y[0]*scale[1],y[1]*scale[1],y[2]*scale[1],0,z[0]*scale[2],z[1]*scale[2],z[2]*scale[2],0,...position,1]);}
export type Geometry={positions:number[];normals:number[]};
export function boxGeometry():Geometry{const positions:number[]=[],normals:number[]=[];for(const [n,u,v] of [ [[1,0,0],[0,0,-1],[0,1,0]],[[-1,0,0],[0,0,1],[0,1,0]],[[0,1,0],[1,0,0],[0,0,-1]],[[0,-1,0],[1,0,0],[0,0,1]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[-1,0,0],[0,1,0]] ] as [Vec3,Vec3,Vec3][]){for(const [a,b] of [[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]]){positions.push(...n.map((value,i)=>(value+a*u[i]+b*v[i])*.5));normals.push(...n);}}return {positions,normals};}
export function cylinderGeometry(profile=[[-.5,.88],[-.43,1],[.43,1],[.5,.88]]):Geometry{
 const positions:number[]=[],normals:number[]=[],segments=64;
 for(let j=0;j<profile.length-1;j++)for(let i=0;i<segments;i++){
  const a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments,[y0,r0]=profile[j],[y1,r1]=profile[j+1],slope=(r0-r1)/(y1-y0);
  for(const [angle,y,r] of [[a,y0,r0],[b,y0,r0],[b,y1,r1],[a,y0,r0],[b,y1,r1],[a,y1,r1]]){positions.push(Math.cos(angle)*r,y,Math.sin(angle)*r);normals.push(...normalize([Math.cos(angle),slope,Math.sin(angle)]));}
 }
 for(const [y,sign,r] of [[profile[0][0],-1,profile[0][1]],[profile[profile.length-1][0],1,profile[profile.length-1][1]]])for(let i=0;i<segments;i++){const a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments;for(const [x,z] of [[0,0],[r*Math.cos(a),r*Math.sin(a)],[r*Math.cos(b),r*Math.sin(b)]]){positions.push(x,y,z);normals.push(0,sign,0);}}
 return {positions,normals};
}
