import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
const require=createRequire(import.meta.url),database=process.env.TEST_DATABASE_URL;
if(!database)throw new Error('Set TEST_DATABASE_URL; the business database must never be used.');
const url=new URL(database);if(url.pathname!=='/chapa_tronix_test'||!['127.0.0.1','localhost'].includes(url.hostname)||url.port!=='55437')throw new Error('SMS tests require local chapa_tronix_test on port 55437.');
const port=3125,runId=randomUUID(),base='http://127.0.0.1:'+port;
const env={...process.env,DATABASE_URL:database,TEST_DATABASE_URL:database,SELLING_MODE:'test',NODE_ENV:'development',MAIL_PROVIDER:'disabled',PAYMENT_PROVIDER:'disabled',SMS_PROVIDER:'mock',SMS_SEND_ENABLED:'true',SMS_SENDER_ID:'CHAPATRONIX',BEEM_API_KEY:'',BEEM_SECRET_KEY:'',SMS_CUSTOM_API_KEY:'',SMS_CUSTOM_WEBHOOK_SECRET:'',SMS_CUSTOM_URL:'',APP_URL:base,TRUSTED_ORIGINS:base,TEST_BASE_URL:base,AUDIT_RUN_ID:runId,AUDIT_SERVER_PORT:String(port),AUTH_REQUIRE_EMAIL_VERIFICATION:'false',NEXT_DIST_DIR:'.next-sms-test-'+runId.slice(0,8),NEXT_TELEMETRY_DISABLED:'1'};
let server;
async function run(file){await new Promise((resolve,reject)=>{const child=spawn(process.execPath,file.endsWith('.ts')?[require.resolve('tsx/cli'),file]:[file],{env,windowsHide:true,stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(file+' failed with exit '+code)));});}
try{
 await run('tests/sms-integration.ts');
 server=spawn(process.execPath,['tests/audit-server.mjs'],{env,windowsHide:true,stdio:['ignore','inherit','inherit','ipc']});
 const deadline=Date.now()+180000;let ready=false;
 while(Date.now()<deadline){if(server.exitCode!==null)throw new Error('SMS test server exited before readiness.');try{const response=await fetch(base+'/api/config',{signal:AbortSignal.timeout(5000)});if(response.ok){const config=await response.json();if(config.testRunId===runId&&config.isolatedTestDatabase===true){ready=true;break;}}}catch{}await new Promise(resolve=>setTimeout(resolve,1000));}
 if(!ready)throw new Error('SMS test server readiness failed.');
 await run('tests/sms-journeys.mjs');
 console.log(JSON.stringify({smsVerification:'domain, authorization and browser passed',liveSms:0}));
}catch(error){console.error(error.message);process.exitCode=1;}
finally{if(server?.connected){server.send({type:'audit-stop'});await new Promise(resolve=>{const timer=setTimeout(resolve,10000);server.once('exit',()=>{clearTimeout(timer);resolve();});});}if(server&&server.exitCode===null)server.kill('SIGKILL');}
