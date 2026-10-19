import {spawn,spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {localEnvironment} from './local-environment.mjs';
import {manageMailWorker} from './managed-mail-worker.mjs';
import {manageOrderWorker} from './managed-order-worker.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function main(){
 const fileEnv=parseEnv(await readFile(path.join(root,'.env'),'utf8'));
 let savedBuild;try{savedBuild=JSON.parse(await readFile(path.join(root,'.local-server/production-build.json'),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 const port=Number(process.env.PORT||5186),dist=process.env.NEXT_DIST_DIR||savedBuild?.dist||'.next-compact-20261018';
 if(!existsSync(path.join(root,dist,'BUILD_ID')))throw new Error('Production build missing. Run npm.cmd run production:build first.');
 const env={...fileEnv,...process.env,NODE_ENV:'production',NEXT_DIST_DIR:dist,...localEnvironment({port,publicUrl:process.env.PUBLIC_SITE_URL||fileEnv.PUBLIC_SITE_URL})};
 const database=spawnSync(process.execPath,[path.join(root,'scripts/start-local.mjs'),'--database-only'],{cwd:root,env,stdio:'inherit',windowsHide:true});
 if(database.status!==0)throw new Error('The local database did not start.');
 console.log(`Build: ${dist}\nProduction website: ${env.APP_URL}\nLocal server: http://127.0.0.1:${port}`);
 const child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(port)],{cwd:root,env,stdio:['inherit','pipe','inherit'],windowsHide:true});
 child.stdout.on('data',chunk=>process.stdout.write(chunk));
 const stopMail=manageMailWorker(child,{root,env:env});
 const stopOrders=manageOrderWorker(child,{root,env});
 child.on('error',error=>{console.error(error.message);process.exitCode=1;});
 child.on('exit',code=>{process.exitCode=code??1;});
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopMail?.();stopOrders?.();child.kill(signal);});
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
