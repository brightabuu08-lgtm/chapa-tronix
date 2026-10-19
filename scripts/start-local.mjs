import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {localEnvironment} from './local-environment.mjs';
import {manageMailWorker} from './managed-mail-worker.mjs';
const run=promisify(execFile),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const testMode=process.argv.includes('--test'),port=testMode?3107:5186;
const bin=process.env.PG_BIN||'C:\\Program Files\\PostgreSQL\\18\\bin';
const pgctl=path.join(bin,process.platform==='win32'?'pg_ctl.exe':'pg_ctl');
const state=path.join(root,'.local-db');
async function main(){
 if(!testMode&&!process.argv.includes('--dev')&&!process.argv.includes('--database-only')){await import('./start-production.mjs');return;}
 let credentials;
 try{credentials=JSON.parse(await readFile(path.join(state,'credentials.json'),'utf8'));}catch{throw new Error('Run npm run local:setup first.');}
 try{await run(path.join(bin,process.platform==='win32'?'pg_isready.exe':'pg_isready'),['-h','127.0.0.1','-p','55437','-q','-t','3'],{windowsHide:true,timeout:5000});}
 catch{await new Promise((resolve,reject)=>{const child=spawn(pgctl,['-D',path.join(state,'data'),'-l',path.join(state,'postgres.log'),'-w','-t','15','start','-o','-p 55437 -h 127.0.0.1'],{windowsHide:true,stdio:'ignore'});const timer=setTimeout(()=>{child.kill();reject(new Error('Database startup timed out. Check .local-db/postgres.log and port 55437.'));},20000);child.on('error',error=>{clearTimeout(timer);reject(error)});child.on('exit',code=>{clearTimeout(timer);code===0?resolve():reject(new Error('The local database did not start. Check .local-db/postgres.log and port 55437.'))});});}
 if(process.argv.includes('--database-only')){console.log('Local PostgreSQL is ready.');return;}
 let fileEnv={};
 try{fileEnv=parseEnv(await readFile(path.join(root,'.env'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 const env={...process.env,NEXT_DIST_DIR:process.env.NEXT_DIST_DIR||`.next-local-${port}`,...localEnvironment({port,testMode,publicUrl:process.env.PUBLIC_SITE_URL||fileEnv.PUBLIC_SITE_URL})};
 if(testMode){env.SELLING_MODE='test';env.MAIL_PROVIDER='disabled';env.PAYMENT_PROVIDER='disabled';env.DATABASE_URL=`postgresql://chapa_tronix_test:${credentials.test}@127.0.0.1:55437/chapa_tronix_test?schema=public`;env.NEXT_DIST_DIR='.next-test';env.PRODUCT_UPLOAD_DIR=path.join(state,'test-images');}
 console.log(`Chapa tronix ${testMode?'isolated test':'local'} website: http://localhost:${port}`);
 if(!testMode&&env.APP_URL.startsWith('https://'))console.log(`Public website: ${env.APP_URL}`);
 const child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port',String(port)],{env,cwd:root,stdio:['inherit','pipe','inherit'],windowsHide:true});
 child.stdout.on('data',chunk=>process.stdout.write(chunk));
 const stopMail=manageMailWorker(child,{root,env:{...fileEnv,...env},testMode});
 child.on('error',error=>{console.error(error.message);process.exitCode=1;});
 child.on('exit',code=>{process.exitCode=code??1;});
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopMail?.();child.kill(signal);});
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
