import {assertIsolatedTestServer} from './isolated-server.mjs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient} from '../generated/prisma-v6';
if(new URL(process.env.DATABASE_URL||'').pathname!=='/chapa_tronix_test')throw new Error('Use the isolated test database.');
const db=new PrismaClient(),base=process.env.TEST_BASE_URL||'http://localhost:3107',uid=randomUUID();let cookie='',checks=0;
await assertIsolatedTestServer(base);
const password='Verification-Test-Only-Password-12345';
function check(v:unknown,label:string){assert.ok(v,label);checks++;console.log('PASS '+label)}
async function api(route:string,body?:unknown,method=body?'POST':'GET'){const r=await fetch(base+'/api/'+route,{method,headers:{Origin:base,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {r,d:await r.json()};}
try{
 let firstEmail='',firstCookie='';
 for(let userIndex=0;userIndex<3;userIndex++){
  cookie=''; // Each registration represents an independent browser/session.
  const email=`verification-${userIndex}-${uid}@example.test`;
  let result=await api('auth/register',{name:'Verification Customer',email,password});check(result.r.status===201,'limited registration session '+userIndex);cookie=result.r.headers.get('set-cookie')!.split(';')[0];if(!userIndex){firstEmail=email;firstCookie=cookie;}
  for(let requestIndex=0;requestIndex<3;requestIndex++){result=await api('auth/recovery',{action:'request-verify'});check(result.r.ok,'verification quota belongs only to account '+userIndex+' request '+requestIndex);}
  result=await api('auth/recovery',{action:'request-verify'});check(result.r.status===429,'per-account verification throttle is enforced');
 }
 cookie=firstCookie;
 for(const [route,body] of [['account',undefined],['wishlist',undefined],['chat',undefined],['account/export',undefined],['checkout',{}]] as const){const result=await api(route,body);check(result.r.status===403,'unverified registration session blocked '+route);}
 let result=await api('auth/me');check(result.r.ok,'unverified account can access verification identity');
 const job=await db.emailJob.findFirstOrThrow({where:{recipient:firstEmail,text:{contains:'/verify-email#token='}},orderBy:[{createdAt:'desc'},{id:'desc'}]});const token=job.text.match(/#token=([^\s]+)/)![1];
 check(!job.text.includes('?token='),'new recovery/verification secrets stay in the URL fragment');
 result=await api('auth/recovery',{action:'verify',token});check(result.r.ok,'email proof verifies the account');
 result=await api('account');check(result.r.ok,'verified registration session gains account access');
 result=await api('auth/recovery',{action:'verify',token});check(result.r.status===400,'verification token is single use');
 result=await api('auth/recovery',{action:'request-reset',email:firstEmail});check(result.r.ok,'reset request accepted without exposing account existence');
 const reset=await db.emailJob.findFirstOrThrow({where:{recipient:firstEmail,text:{contains:'/reset-password#token='}},orderBy:[{createdAt:'desc'},{id:'desc'}]});const resetToken=reset.text.match(/#token=([^\s]+)/)![1];
 result=await api('auth/recovery',{action:'reset',token:resetToken,password:password+'-changed'});check(result.r.ok,'reset consumes its proof and updates password');
 result=await api('account');check(result.r.status===401,'password reset revokes existing sessions');cookie='';
 result=await api('auth/login',{identifier:firstEmail,password});check(result.r.status===401,'old password denied after reset');
 result=await api('auth/login',{identifier:firstEmail,password:password+'-changed'});check(result.r.ok,'new password signs in');
 console.log(JSON.stringify({verificationHttpChecks:checks,result:'passed'}));
}finally{await db.$disconnect();}
