import {spawn} from 'node:child_process';
import {mkdir,writeFile,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=process.env.NEXT_DIST_DIR||`.next-production-${Date.now()}`;
const child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'build','--webpack'],{cwd:root,env:{...process.env,NEXT_DIST_DIR:dist},stdio:'inherit',windowsHide:true});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',async code=>{
 process.exitCode=code??1;
 if(code!==0)return;
 try{
  const directory=path.join(root,'.local-server');await mkdir(directory,{recursive:true});
  const manifest=path.join(directory,'production-build.json');
  await writeFile(manifest+'.tmp',JSON.stringify({dist,builtAt:new Date().toISOString()})+'\n');
  await rename(manifest+'.tmp',manifest);
  console.log('Production build saved. Run npm.cmd run production to use it.');
 }catch(error){console.error(error.message);process.exitCode=1;}
});
