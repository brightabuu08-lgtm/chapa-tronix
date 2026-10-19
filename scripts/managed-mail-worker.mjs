import {spawn} from 'node:child_process';
import path from 'node:path';
const keys=['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','HOME','USERPROFILE','NODE_ENV','DATABASE_URL','APP_URL','MAIL_PROVIDER','BREVO_API_KEY','RESEND_API_KEY','MAIL_FROM','MAIL_FROM_NAME','MAIL_REPLY_TO'];
export function mailWorkerEnvironment(source,testMode=false){
 if(testMode||!source.DATABASE_URL||!source.MAIL_FROM||!(source.MAIL_PROVIDER==='brevo'&&source.BREVO_API_KEY||source.MAIL_PROVIDER==='resend'&&source.RESEND_API_KEY))return null;
 return Object.fromEntries(keys.filter(key=>source[key]!==undefined).map(key=>[key,source[key]]));
}
export function manageMailWorker(server,{root,env,testMode=false},launch=spawn){
 const workerEnv=mailWorkerEnvironment(env,testMode);if(!workerEnv)return;
 let worker,output='',stopped=false;
 const stop=()=>{stopped=true;worker?.kill('SIGTERM');};
 server.once('exit',stop);server.once('error',stop);process.once('exit',stop);
 server.stdout?.on('data',chunk=>{
  output=(output+String(chunk)).slice(-2000);
  if(stopped||worker||!output.includes('Ready in'))return;
  worker=launch(process.execPath,[path.join(root,'node_modules/tsx/dist/cli.mjs'),path.join(root,'scripts/mail-worker.ts')],{cwd:root,env:workerEnv,stdio:'inherit',windowsHide:true});
  worker.on('error',()=>console.error('Email worker could not start.'));
  worker.on('exit',code=>{if(!stopped&&code!==0)console.error('Email worker stopped unexpectedly. Restart the website to restore delivery.');});
 });
 return stop;
}
