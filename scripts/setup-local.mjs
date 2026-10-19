import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const run=promisify(execFile),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const stateDir=path.join(root,'.local-db'),dataDir=path.join(stateDir,'data'),port=55437;
const bin=process.env.PG_BIN||'C:\\Program Files\\PostgreSQL\\18\\bin';
const tool=name=>path.join(bin,name+(process.platform==='win32'?'.exe':''));
async function exists(file){try{await access(file);return true}catch{return false}}
async function sql(query,secret){await new Promise((resolve,reject)=>{
 const child=spawn(tool('psql'),['-h','127.0.0.1','-p',String(port),'-U','chapa_cluster_admin','-d','postgres','-w','-v','ON_ERROR_STOP=1','-q'],{env:{...process.env,PGPASSWORD:secret},windowsHide:true,stdio:['pipe','pipe','pipe']});
 child.stdout.resume();child.stderr.resume();child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('Database setup failed. No credentials were printed.')));child.stdin.end(query);
 });}
async function command(file,args,env){const result=await run(file,args,{cwd:root,env,windowsHide:true,maxBuffer:4*1024*1024});process.stdout.write(result.stdout);}
async function main(){
 await mkdir(stateDir,{recursive:true});
 const credentialsPath=path.join(stateDir,'credentials.json');
 let creds;
 if(await exists(credentialsPath))creds=JSON.parse(await readFile(credentialsPath,'utf8'));
 else{creds={cluster:randomBytes(32).toString('hex'),app:randomBytes(32).toString('hex'),test:randomBytes(32).toString('hex'),admin:randomBytes(20).toString('base64url')};await writeFile(credentialsPath,JSON.stringify(creds),{mode:0o600,flag:'wx'});}
 if(!await exists(path.join(dataDir,'PG_VERSION'))){
  const pwfile=path.join(stateDir,'cluster-password.txt');await writeFile(pwfile,creds.cluster,{mode:0o600});
  await command(tool('initdb'),['-D',dataDir,'-U','chapa_cluster_admin','--auth-host=scram-sha-256','--auth-local=scram-sha-256','--pwfile',pwfile,'--encoding=UTF8','--locale=C'],process.env);
 }
 try{await run(tool('pg_isready'),['-h','127.0.0.1','-p',String(port),'-q','-t','3'],{windowsHide:true});}
 catch{await new Promise((resolve,reject)=>{const child=spawn(tool('pg_ctl'),['-D',dataDir,'-l',path.join(stateDir,'postgres.log'),'-w','start','-o',`-p ${port} -h 127.0.0.1`],{env:process.env,windowsHide:true,stdio:'ignore'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('PostgreSQL could not start. Inspect the local database log.')));});}
 await sql(`SELECT 'CREATE ROLE chapa_tronix_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD ''${creds.app}''' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname='chapa_tronix_app')\n\\gexec\nSELECT 'CREATE ROLE chapa_tronix_test LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD ''${creds.test}''' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname='chapa_tronix_test')\n\\gexec\nSELECT 'CREATE DATABASE chapa_tronix OWNER chapa_tronix_app' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='chapa_tronix')\n\\gexec\nSELECT 'CREATE DATABASE chapa_tronix_test OWNER chapa_tronix_test' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='chapa_tronix_test')\n\\gexec\nREVOKE CONNECT ON DATABASE chapa_tronix FROM PUBLIC;\nGRANT CONNECT ON DATABASE chapa_tronix TO chapa_tronix_app;\nREVOKE CONNECT ON DATABASE chapa_tronix_test FROM PUBLIC;\nGRANT CONNECT ON DATABASE chapa_tronix_test TO chapa_tronix_test;`,creds.cluster);
 const databaseUrl=`postgresql://chapa_tronix_app:${creds.app}@127.0.0.1:${port}/chapa_tronix?schema=public`,testUrl=`postgresql://chapa_tronix_test:${creds.test}@127.0.0.1:${port}/chapa_tronix_test?schema=public`;
 const envPath=path.join(root,'.env');
 if(!await exists(envPath)){
  const example=await readFile(path.join(root,'.env.example'),'utf8');
  const values={DATABASE_URL:databaseUrl,APP_URL:'http://localhost:5186',NEXT_PUBLIC_APP_URL:'http://localhost:5186',TRUSTED_ORIGINS:'http://localhost:5186,http://127.0.0.1:5186',ADMIN_EMAIL:'admin@chapatronix.local',ADMIN_PASSWORD:creds.admin};
  let text=example;for(const [key,value] of Object.entries(values))text=text.replace(new RegExp('^'+key+'=.*$','m'),key+'='+JSON.stringify(value));
  await writeFile(envPath,text,{mode:0o600,flag:'wx'});
 }
 const env={...process.env,DATABASE_URL:databaseUrl,ADMIN_EMAIL:'admin@chapatronix.local',ADMIN_PASSWORD:creds.admin};
 const prisma=path.join(root,'node_modules/prisma/build/index.js');
 await command(process.execPath,[path.join(root,'scripts/generate-client.mjs')],env);
 await command(process.execPath,[prisma,'migrate','deploy'],env);
 await command(process.execPath,[path.join(root,'node_modules/tsx/dist/cli.mjs'),'prisma/seed.ts'],env);
 await command(process.execPath,[prisma,'migrate','deploy'],{...env,DATABASE_URL:testUrl});
 await command(process.execPath,[path.join(root,'node_modules/tsx/dist/cli.mjs'),'prisma/seed.ts'],{...env,DATABASE_URL:testUrl});
 console.log('Local database and separate test database are ready. Admin login is recorded privately in .env. Existing products and credentials were preserved.');
}
main().catch(error=>{console.error('Local setup stopped:',error.message);process.exitCode=1;});
