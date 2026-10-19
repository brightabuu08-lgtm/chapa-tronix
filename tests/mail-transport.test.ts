import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deliverEmail,mailConfigured} from '../lib/mail-transport';

const job={id:'fixture-job-1',recipient:'customer@example.test',subject:'Oda CT-1',text:'Oda imepokelewa; bado haijalipwa.'};
const env={MAIL_PROVIDER:'brevo',BREVO_API_KEY:'mock-only',MAIL_FROM:'orders@example.test',MAIL_REPLY_TO:'support@example.test'};

test('disabled, incomplete and unsupported mail configuration makes no provider request',async()=>{
 for(const config of [{...env,MAIL_PROVIDER:'disabled'},{...env,BREVO_API_KEY:''},{...env,MAIL_FROM:''},{...env,MAIL_PROVIDER:'unknown'}]){
  assert.equal(mailConfigured(config),false);
  await assert.rejects(deliverEmail(job,config,async()=>{assert.fail('No network call allowed');}),/mail_not_configured/);
 }
});
test('Brevo uses authenticated transactional endpoint, stable outbox key and plain text',async()=>{
 let calls=0;
 const request:typeof fetch=async(url,init)=>{
  calls++;assert.equal(url,'https://api.brevo.com/v3/smtp/email');assert.equal(init?.method,'POST');
  const headers=new Headers(init?.headers);assert.equal(headers.get('api-key'),'mock-only');assert.equal(headers.has('Authorization'),false);
  const body=JSON.parse(String(init?.body));
  assert.deepEqual(body.sender,{email:env.MAIL_FROM,name:'chapa tronix'});
  assert.deepEqual(body.to,[{email:job.recipient}]);assert.deepEqual(body.replyTo,{email:env.MAIL_REPLY_TO});
  assert.equal(body.textContent,job.text);assert.equal(body.subject,job.subject);assert.equal(body.headers.IdempotencyKey,job.id);
  return Response.json({messageId:'mock-brevo-reference'},{status:201});
 };
 assert.equal(await deliverEmail(job,env,request),'mock-brevo-reference');
 await deliverEmail(job,env,request);assert.equal(calls,2);
});
test('provider rejection, malformed acceptance and timeout remain errors for outbox retry',async()=>{
 for(const request of [async()=>Response.json({message:'private provider detail'},{status:429}),async()=>Response.json({}),async()=>{throw new Error('timeout');}]){
  await assert.rejects(deliverEmail(job,env,request));
 }
});
test('Resend remains supported with its own authentication and response contract',async()=>{
 const result=await deliverEmail(job,{MAIL_PROVIDER:'resend',RESEND_API_KEY:'resend-mock',MAIL_FROM:'orders@example.test'},async(url,init)=>{
  assert.equal(url,'https://api.resend.com/emails');
  assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer resend-mock');
  assert.equal(new Headers(init?.headers).get('Idempotency-Key'),job.id);
  assert.equal(JSON.parse(String(init?.body)).text,job.text);
  return Response.json({id:'resend-mock-reference'});
 });assert.equal(result,'resend-mock-reference');
});
