import {boxGeometry,cylinderGeometry,lookAt,multiply,ortho,perspective,type Geometry} from './geometry';
import {staticWorkcell,movingWorkcell,type Part} from './scene';

const vertex=`#version 300 es
in vec3 position;in vec3 normal;
uniform mat4 model;uniform mat4 viewProjection;uniform mat4 lightProjection;
out vec3 worldPosition;out vec3 worldNormal;out vec4 shadowPosition;
void main(){vec4 world=model*vec4(position,1.);worldPosition=world.xyz;worldNormal=normalize(mat3(model)*normal);shadowPosition=lightProjection*world;gl_Position=viewProjection*world;}`;
const fragment=`#version 300 es
precision highp float;
in vec3 worldPosition;in vec3 worldNormal;in vec4 shadowPosition;
uniform vec3 color;uniform vec3 eye;uniform float shine;uniform float sceneTime;uniform sampler2D shadowMap;uniform float shadowSize;
out vec4 outputColor;
void main(){
 vec3 n=normalize(worldNormal),light=normalize(vec3(-3.,7.,5.)),v=normalize(eye-worldPosition);
 vec3 coord=shadowPosition.xyz/shadowPosition.w*.5+.5;float shadow=0.;
 if(coord.x>0.&&coord.x<1.&&coord.y>0.&&coord.y<1.){float bias=max(.0013*(1.-dot(n,light)),.0006);for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){float depth=texture(shadowMap,coord.xy+vec2(float(x),float(y))/shadowSize).r;shadow+=coord.z-bias>depth?1.:0.;}shadow/=9.;}
 float diffuse=max(dot(n,light),0.);float spec=pow(max(dot(n,normalize(light+v)),0.),mix(24.,110.,shine))*shine*.48;
 vec3 surface=color;
 if(worldPosition.y<-.06&&n.y>.9){
  // Seamless midnight studio, with broad teal and blue softbox reflections.
  vec2 floorPoint=worldPosition.xz;
  float teal=exp(-dot(floorPoint-vec2(3.,-3.),floorPoint-vec2(3.,-3.))*.026);
  float blue=exp(-dot(floorPoint-vec2(-5.,-5.),floorPoint-vec2(-5.,-5.))*.022);
  float rim=exp(-dot(floorPoint-vec2(5.,4.),floorPoint-vec2(5.,4.))*.055);
  vec3 midnight=vec3(.045,.075,.15)+vec3(.025,.24,.225)*teal+vec3(.085,.095,.25)*blue;
  vec3 violet=vec3(.105,.055,.15)+vec3(.16,.07,.19)*teal+vec3(.035,.18,.20)*blue;
  float transition=.5-.5*cos(sceneTime*.09);
  surface=mix(midnight,violet,transition)+vec3(.055,.065,.07)*rim;
 }
 vec3 base=pow(surface,vec3(2.2));float hemisphere=.36+.15*max(n.y,0.);
 vec3 lit=base*(hemisphere+diffuse*.65*(1.-shadow*.58))+vec3(spec)*(1.-shadow*.7);
 outputColor=vec4(pow(lit,vec3(1./2.2)),1.);
}`;
const depthVertex=`#version 300 es
in vec3 position;uniform mat4 model;uniform mat4 viewProjection;void main(){gl_Position=viewProjection*model*vec4(position,1.);}`;
const depthFragment=`#version 300 es
precision highp float;void main(){}`;

export type RobotRenderer={setPaused:(paused:boolean)=>void;dispose:()=>void};
export function createRobotRenderer(canvas:HTMLCanvasElement,onReady:()=>void,onFailure:()=>void):RobotRenderer{
 const gl=canvas.getContext('webgl2',{alpha:false,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:true});
 if(!gl)throw new Error('WebGL2 unavailable');
 const programs:WebGLProgram[]=[],buffers:WebGLBuffer[]=[];
 function program(vs:string,fs:string){
  const shaders=[vs,fs].map((source,i)=>{const shader=gl!.createShader(i===0?gl!.VERTEX_SHADER:gl!.FRAGMENT_SHADER)!;gl!.shaderSource(shader,source);gl!.compileShader(shader);if(!gl!.getShaderParameter(shader,gl!.COMPILE_STATUS)){const message=gl!.getShaderInfoLog(shader);gl!.deleteShader(shader);throw new Error(message||'Shader compilation failed');}return shader;});
  const p=gl!.createProgram()!;for(const s of shaders)gl!.attachShader(p,s);gl!.linkProgram(p);for(const s of shaders)gl!.deleteShader(s);if(!gl!.getProgramParameter(p,gl!.LINK_STATUS))throw new Error('Scene program failed');programs.push(p);return p;
 }
 const main=program(vertex,fragment),depth=program(depthVertex,depthFragment);
 function geometry(data:Geometry){const upload=(values:number[])=>{const b=gl!.createBuffer()!;buffers.push(b);gl!.bindBuffer(gl!.ARRAY_BUFFER,b);gl!.bufferData(gl!.ARRAY_BUFFER,new Float32Array(values),gl!.STATIC_DRAW);return b;};return {position:upload(data.positions),normal:upload(data.normals),count:data.positions.length/3};}
 const meshes={box:geometry(boxGeometry()),cylinder:geometry(cylinderGeometry()),casting:geometry(cylinderGeometry([[-.5,.58],[-.43,.83],[-.25,1],[.2,.93],[.4,.72],[.5,.58]]))};
 const shadowSize=matchMedia('(max-width:760px)').matches?1024:2048,texture=gl.createTexture()!,framebuffer=gl.createFramebuffer()!;
 gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,shadowSize,shadowSize,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,texture,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);
 if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Shadow target unavailable');gl.bindFramebuffer(gl.FRAMEBUFFER,null);
 const uniforms=(p:WebGLProgram)=>Object.fromEntries(['model','viewProjection','lightProjection','color','eye','shine','shadowMap','shadowSize','sceneTime'].map(name=>[name,gl.getUniformLocation(p,name)]));
 const locations={main:uniforms(main),depth:uniforms(depth)};
 const attributes=(p:WebGLProgram)=>({position:gl.getAttribLocation(p,'position'),normal:gl.getAttribLocation(p,'normal')});const attrs={main:attributes(main),depth:attributes(depth)};
 const lightProjection=multiply(ortho(),lookAt([-3,7,5],[0,.8,0])),staticParts=staticWorkcell(),immersive=canvas.dataset.immersive==='true';
 let paused=false,visible=true,disposed=false,raf=0,last=0,time=.65,ready=false,scrollProgress=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
 function draw(parts:Part[],shadow:boolean){
  const p=shadow?depth:main,u=shadow?locations.depth:locations.main,a=shadow?attrs.depth:attrs.main;
  const aspect=canvas.width/canvas.height,portrait=aspect<.9,scale=immersive?(portrait?1.4:1):1.08*Math.max(1,1.6/aspect),eye:[number,number,number]=[4.8*scale,3.8*scale,6.6*scale],view=lookAt(eye,[0,.85,0]),projection=perspective(aspect);
  if(immersive){projection[8]=portrait?0:-.32;projection[9]=(portrait?.2:0)-scrollProgress*(portrait?.16:.23);}
  gl!.useProgram(p);gl!.uniformMatrix4fv(u.viewProjection,false,shadow?lightProjection:multiply(projection,view));
  if(!shadow){gl!.uniformMatrix4fv(u.lightProjection,false,lightProjection);gl!.uniform3fv(u.eye,eye);gl!.uniform1f(u.shadowSize,shadowSize);gl!.uniform1f(u.sceneTime,reduced.matches?0:time);gl!.activeTexture(gl!.TEXTURE0);gl!.bindTexture(gl!.TEXTURE_2D,texture);gl!.uniform1i(u.shadowMap,0);}
  for(const part of parts){const mesh=meshes[part.mesh];gl!.bindBuffer(gl!.ARRAY_BUFFER,mesh.position);gl!.enableVertexAttribArray(a.position);gl!.vertexAttribPointer(a.position,3,gl!.FLOAT,false,0,0);if(!shadow){gl!.bindBuffer(gl!.ARRAY_BUFFER,mesh.normal);gl!.enableVertexAttribArray(a.normal);gl!.vertexAttribPointer(a.normal,3,gl!.FLOAT,false,0,0);gl!.uniform3fv(u.color,part.color);gl!.uniform1f(u.shine,part.shine);}gl!.uniformMatrix4fv(u.model,false,part.matrix);gl!.drawArrays(gl!.TRIANGLES,0,mesh.count);}
 }
 function render(){
  if(disposed)return;
  const dpr=Math.min(Math.max(window.devicePixelRatio||1,1.5),2),width=Math.max(1,Math.round(canvas.clientWidth*dpr)),height=Math.max(1,Math.round(canvas.clientHeight*dpr));if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  const parts=[...staticParts,...movingWorkcell(time)];
  gl!.bindFramebuffer(gl!.FRAMEBUFFER,framebuffer);gl!.viewport(0,0,shadowSize,shadowSize);gl!.colorMask(false,false,false,false);gl!.clear(gl!.DEPTH_BUFFER_BIT);gl!.enable(gl!.POLYGON_OFFSET_FILL);gl!.polygonOffset(1.3,2.5);draw(parts,true);gl!.disable(gl!.POLYGON_OFFSET_FILL);
  gl!.bindFramebuffer(gl!.FRAMEBUFFER,null);gl!.viewport(0,0,canvas.width,canvas.height);gl!.colorMask(true,true,true,true);gl!.clearColor(.06,.12,.18,1);gl!.clear(gl!.COLOR_BUFFER_BIT|gl!.DEPTH_BUFFER_BIT);draw(parts,false);
  canvas.dataset.motion=paused||reduced.matches?'paused':'running';
  if(!ready){ready=true;onReady();}
 }
 function tick(now:number){
  if(disposed)return;
  if(visible&&!document.hidden&&!paused&&!reduced.matches&&now-last>=1000/30){time+=Math.min((now-last)/1000,.05);last=now;render();}else if(!visible||document.hidden||paused||reduced.matches)last=now;
  raf=requestAnimationFrame(tick);
 }
 const resize=new ResizeObserver(()=>render());resize.observe(canvas);
 const observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??true;last=performance.now();});observer.observe(canvas);
 const mediaChange=()=>render();reduced.addEventListener('change',mediaChange);
 const scrollChange=()=>{scrollProgress=reduced.matches?0:Math.max(0,Math.min(1,window.scrollY/Math.max(1,window.innerHeight)));if(paused||reduced.matches)render();};
 if(immersive){window.addEventListener('scroll',scrollChange,{passive:true});scrollChange();}
 const lost=(event:Event)=>{event.preventDefault();onFailure();};canvas.addEventListener('webglcontextlost',lost);
 render();last=performance.now();raf=requestAnimationFrame(tick);
 return {setPaused(value){paused=value;last=performance.now();render();},dispose(){disposed=true;cancelAnimationFrame(raf);resize.disconnect();observer.disconnect();reduced.removeEventListener('change',mediaChange);if(immersive)window.removeEventListener('scroll',scrollChange);canvas.removeEventListener('webglcontextlost',lost);for(const b of buffers)gl.deleteBuffer(b);for(const p of programs)gl.deleteProgram(p);gl.deleteFramebuffer(framebuffer);gl.deleteTexture(texture);}};
}
