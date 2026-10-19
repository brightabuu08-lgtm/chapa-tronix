import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {existsSync} from 'node:fs';
export function sharingEnvironment(publicUrl,port=5186){
 const url=new URL(publicUrl);
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('Use the HTTPS origin only, without a path, query or credentials.');
 return {APP_URL:url.origin,NEXT_PUBLIC_APP_URL:url.origin,TRUSTED_ORIGINS:[url.origin,`http://localhost:${port}`,`http://127.0.0.1:${port}`].join(','),__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS:url.hostname};
}
async function main(){
 const args=process.argv.slice(2),index=args.indexOf('--url'),publicUrl=index>=0?args[index+1]:undefined;
 if(index>=0&&!publicUrl)throw new Error('Provide an HTTPS URL after --url.');
 const port=Number(process.env.PORT)||5186;
 let detectedUrl=publicUrl;
 if(!detectedUrl){
  try{
   const response=await fetch('http://127.0.0.1:4040/api/tunnels',{signal:AbortSignal.timeout(5000)});
   if(!response.ok)throw new Error('Tunnel inspector unavailable.');
   const data=await response.json();
   const addresses=[String(port),`localhost:${port}`,`127.0.0.1:${port}`,`http://localhost:${port}`,`http://127.0.0.1:${port}`];
   const tunnels=data.tunnels.filter(v=>v.public_url?.startsWith('https://')&&addresses.includes(v.config?.addr));
   if(tunnels.length!==1)throw new Error('Expected one matching tunnel.');
   detectedUrl=tunnels[0].public_url;
  }catch{throw new Error('Start ngrok http 5186 in another CMD first, or use npm run share -- --url https://YOUR-DOMAIN.');}
 }
 const env={...process.env,NEXT_DIST_DIR:process.env.NEXT_DIST_DIR||`.next-local-${port}`,...sharingEnvironment(detectedUrl,port)};
 const directory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 if(existsSync(path.join(directory,'.local-db/credentials.json'))){const database=spawnSync(process.execPath,[path.join(directory,'scripts/start-local.mjs'),'--database-only'],{cwd:directory,stdio:'inherit',windowsHide:true});if(database.status!==0)throw new Error('The local database did not start.');}
 console.log(`Website: ${env.APP_URL}\nLocal: http://localhost:${port}\nKeep the website and ngrok terminals open. Database services require DATABASE_URL and completed migrations.`);
 const child=spawn(process.execPath,[path.join(directory,'node_modules/next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port',String(port)],{cwd:directory,env,stdio:'inherit'});
 child.on('error',error=>{console.error(error.message);process.exitCode=1;});
 child.on('exit',code=>{process.exitCode=code??1;});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
