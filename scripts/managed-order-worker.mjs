import {spawn} from 'node:child_process';
import path from 'node:path';
export function orderWorkerEnvironment(source){
 if(source.SELLING_MODE!=='live'||!source.DATABASE_URL)return null;
 const keys=['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','USERPROFILE','NODE_ENV','DATABASE_URL'];
 return Object.fromEntries(keys.filter(key=>source[key]!==undefined).map(key=>[key,source[key]]));
}
export function manageOrderWorker(server,{root,env},launch=spawn){
 const workerEnv=orderWorkerEnvironment(env);if(!workerEnv)return;
 let worker,output='',stopped=false;
 const stop=()=>{if(stopped)return;stopped=true;worker?.kill('SIGTERM');process.removeListener('exit',stop);};
 server.once('exit',stop);server.once('error',stop);process.once('exit',stop);
 server.stdout?.on('data',chunk=>{
  output=(output+String(chunk)).slice(-2000);
  if(stopped||worker||!output.includes('Ready in'))return;
  worker=launch(process.execPath,[path.join(root,'node_modules/tsx/dist/cli.mjs'),path.join(root,'scripts/order-worker.ts')],{cwd:root,env:workerEnv,stdio:'inherit',windowsHide:true});
  worker.on('error',()=>console.error('Order reservation worker could not start.'));
  worker.on('exit',code=>{if(!stopped&&code!==0)console.error('Order reservation worker stopped. Restart the website to restore reservation expiry.');});
 });
 return stop;
}
