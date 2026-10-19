import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {PrismaClient} from '../generated/prisma-v6/index.js';
import {hash} from 'bcryptjs';

const require=createRequire(import.meta.url),tsxCli=require.resolve('tsx/cli');
const database=process.env.TEST_DATABASE_URL;
if(!database)throw new Error('Set TEST_DATABASE_URL to the isolated test database.');
const parsed=new URL(database);
if(parsed.pathname!=='/chapa_tronix_test'||!['localhost','127.0.0.1'].includes(parsed.hostname)||parsed.port!=='55437')throw new Error('Audit writes are restricted to the local chapa_tronix_test database on port 55437.');
const directory='review/audit-20261016';await mkdir(directory,{recursive:true});
const runId=new Date().toISOString().replace(/[:.]/g,'-'),log=createWriteStream(`${directory}/journeys-${runId}.log`);
const env={...process.env,DATABASE_URL:database,TEST_DATABASE_URL:database,TEST_BASE_URL:'http://localhost:3110',APP_URL:'http://localhost:3110',TRUSTED_ORIGINS:'http://localhost:3110,http://127.0.0.1:3110',SELLING_MODE:'test',MAIL_PROVIDER:'disabled',PAYMENT_PROVIDER:'disabled',PRODUCT_UPLOAD_DIR:'.local-db/audit-test-uploads',S3_BUCKET:'',S3_ENDPOINT:'',ORDER_ACCESS_SECRET:'TEST_ONLY_ORDER_ACCESS_SECRET_32_CHARACTERS_MINIMUM',NODE_ENV:'development',NEXT_TELEMETRY_DISABLED:'1',DOTNET_CLI_TELEMETRY_OPTOUT:'1',NEXT_DIST_DIR:'.next-audit-e2e-3110',ADMIN_EMAIL:'audit-'+randomUUID()+'@example.test',ADMIN_PASSWORD:'Test-Only-'+randomUUID()};
const db=new PrismaClient({datasourceUrl:database}),checks=[];let server;
async function runSuite(file){try{await execute(file)}catch(error){checks.push({file,status:'failed',error:error.message});output(error.message+'\n');process.exitCode=1;}}
function output(data){log.write(data);process.stdout.write(data);}
async function execute(file){
 await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,file.endsWith('.ts')?[tsxCli,file]:[file],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',output);child.stderr.on('data',output);child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`${file} exited ${code}`)));
 });
 checks.push({file,status:'passed'});
}
async function stop(){
 if(!server)return;const target=server;server=undefined;if(target.exitCode!==null)return;
 if(target.connected)target.send({type:'audit-stop'});
 await new Promise(resolve=>{const timer=setTimeout(resolve,10000);target.once('exit',()=>{clearTimeout(timer);resolve()})});
 if(target.exitCode===null)target.kill('SIGKILL');
}
async function start(verification){
 const initialPort=Number(process.env.AUDIT_TEST_PORT||3110);if(!Number.isInteger(initialPort)||initialPort<3110||initialPort>3129)throw new Error('Choose a test port from 3110 to 3129.');const port=String(initialPort+(verification?1:0));env.TEST_BASE_URL=env.APP_URL='http://localhost:'+port;env.TRUSTED_ORIGINS=env.APP_URL+',http://127.0.0.1:'+port;env.NEXT_DIST_DIR='.next-audit-e2e-'+port+'-'+runId.replace(/\D/g,'').slice(-6);env.AUDIT_SERVER_PORT=port;env.AUTH_REQUIRE_EMAIL_VERIFICATION=String(verification);env.AUDIT_RUN_ID=runId+'-'+verification;
 server=spawn(process.execPath,['tests/audit-server.mjs'],{env,cwd:verification&&process.env.TEST_POLICY_APP_DIR?process.env.TEST_POLICY_APP_DIR:process.cwd(),windowsHide:true,stdio:['ignore','pipe','pipe','ipc']});
 server.stdout.on('data',output);server.stderr.on('data',output);
 const deadline=Date.now()+180000;
 while(Date.now()<deadline){if(server.exitCode!==null)throw new Error('Test server exited before readiness.');try{if((await fetch(env.APP_URL+'/api/health',{signal:AbortSignal.timeout(5000)})).ok){const response=await fetch(env.APP_URL+'/api/config',{signal:AbortSignal.timeout(5000)});const config=await response.json();if(config.testRunId===env.AUDIT_RUN_ID&&config.isolatedTestDatabase===true&&config.verificationRequired===verification){
 // Compile development routes before interactive journeys; this is readiness, not a speed measurement.
 for(const route of ['/account','/shop','/api/auth/me','/api/catalog','/api/account/export','/robots.txt','/sitemap.xml'])await fetch(env.APP_URL+route,{signal:AbortSignal.timeout(90000)}).then(response=>response.arrayBuffer());
 return;
}}}catch{}await new Promise(resolve=>setTimeout(resolve,1000));}
 throw new Error('Isolated audit server did not become ready.');
}
try{
 await db.user.create({data:{name:'Audit Test Admin',email:env.ADMIN_EMAIL,passwordHash:await hash(env.ADMIN_PASSWORD,4),role:'ADMIN',emailVerifiedAt:new Date()}});
 await start(false);
 for(const file of (process.env.AUDIT_SUITES?process.env.AUDIT_SUITES.split(','):['tests/category-concurrency.ts','tests/integration.ts','tests/operations.ts','tests/mail-outbox-integration.ts','tests/audit-http.ts','tests/review-browser.mjs','tests/admin-workspace-qa.mjs','tests/admin-image-upload.mjs','tests/audit-browser.mjs']))await runSuite(file);
 await stop();await start(true);await runSuite('tests/verification-http.ts');
 output(JSON.stringify({auditJourneySuites:checks.length,result:checks.some(check=>check.status==='failed')?'failed':'passed'})+'\n');
}catch(error){output(String(error.message)+'\n');checks.push({status:'failed',error:error.message});process.exitCode=1;}
finally{await stop();await db.$disconnect();await writeFile(`${directory}/journeys-${runId}.json`,JSON.stringify({runId,checks},null,2));log.end();}
