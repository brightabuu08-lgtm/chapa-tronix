import {createHmac,timingSafeEqual} from 'node:crypto';
import {smsProviders,smsSize,type SmsProvider} from './sms-contract';
type Env=Record<string,string|undefined>;
export type SmsSubmission={id:string;recipient:string;text:string;sender:string;provider:string};
export class SmsDeliveryError extends Error{constructor(public kind:'rejected'|'throttled'|'uncertain'|'configuration'){super('SMS '+kind);}}
export function customSmsUrl(env:Env=process.env){try{const url=new URL(env.SMS_CUSTOM_URL||'');if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)return null;return url.href.replace(/\/$/,'');}catch{return null;}}
export function smsConfiguration(env:Env=process.env){const provider=smsProviders.find(p=>p===env.SMS_PROVIDER);let testDatabase=false;try{const u=new URL(env.DATABASE_URL||'');testDatabase=u.pathname==='/chapa_tronix_test'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname);}catch{}
 const sender=env.SMS_SENDER_ID||'';const senderValid=/^[A-Za-z][A-Za-z0-9]{2,10}$/.test(sender);
 const configured=provider==='mock'?testDatabase&&env.SELLING_MODE==='test'&&env.NODE_ENV!=='production':provider==='beem'?!!env.BEEM_API_KEY&&!!env.BEEM_SECRET_KEY&&senderValid:provider==='custom'?!!customSmsUrl(env)&&!!env.SMS_CUSTOM_API_KEY&&!!env.SMS_CUSTOM_WEBHOOK_SECRET&&env.SMS_CUSTOM_WEBHOOK_SECRET.length>=32&&senderValid:false;
 return {provider:provider||'disabled',enabled:env.SMS_SEND_ENABLED==='true'&&configured,configured,sender:senderValid?sender:null,testOnly:provider==='mock'};
}
async function responseJson(response:Response){const reader=response.body?.getReader();if(!reader)throw new SmsDeliveryError('uncertain');let size=0;const chunks:Uint8Array[]=[];for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){await reader.cancel();throw new SmsDeliveryError('uncertain');}chunks.push(value);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new SmsDeliveryError('uncertain');}}
export async function submitSms(job:SmsSubmission,env:Env=process.env,request:typeof fetch=fetch):Promise<string>{
 const config=smsConfiguration(env);if(!config.enabled||config.provider!==job.provider||config.sender!==job.sender&&job.provider!=='mock')throw new SmsDeliveryError('configuration');
 if(job.provider==='mock')return 'mock-'+job.id;
 const beem=job.provider==='beem';if(beem&&smsSize(job.text).encoding!=='GSM7')throw new SmsDeliveryError('rejected');
 let response:Response;try{response=await request(beem?'https://apisms.beem.africa/v1/send':customSmsUrl(env)+'/messages',{
  method:'POST',redirect:'error',headers:beem?{Authorization:'Basic '+Buffer.from(env.BEEM_API_KEY+':'+env.BEEM_SECRET_KEY).toString('base64'),'Content-Type':'application/json'}:{Authorization:'Bearer '+env.SMS_CUSTOM_API_KEY,'Content-Type':'application/json','Idempotency-Key':job.id},
  body:JSON.stringify(beem?{source_addr:job.sender,encoding:0,message:job.text,recipients:[{recipient_id:job.id,dest_addr:job.recipient}]}:{clientReference:job.id,to:job.recipient,sender:job.sender,text:job.text}),signal:AbortSignal.timeout(15000)
 });}catch{throw new SmsDeliveryError('uncertain');}
 if(response.status===429)throw new SmsDeliveryError('throttled');if(response.status>=400&&response.status<500&&response.status!==408)throw new SmsDeliveryError('rejected');if(!response.ok)throw new SmsDeliveryError('uncertain');
 const body=await responseJson(response);const reference=beem?body.request_id:body.messageId;
 if(beem?(body.successful!==true||body.code!==100||body.valid!==1):body.status!=='ACCEPTED')throw new SmsDeliveryError('uncertain');
 if(!['string','number'].includes(typeof reference)||!String(reference)||String(reference).length>150)throw new SmsDeliveryError('uncertain');return String(reference);
}
export async function lookupCustomSms(id:string,env:Env=process.env,request:typeof fetch=fetch){
 if(!customSmsUrl(env)||!env.SMS_CUSTOM_API_KEY)throw new SmsDeliveryError('configuration');
 const response=await request(customSmsUrl(env)+'/messages/by-client-reference/'+encodeURIComponent(id),{headers:{Authorization:'Bearer '+env.SMS_CUSTOM_API_KEY},redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new SmsDeliveryError('uncertain');return responseJson(response);
}
export function validSmsSignature(raw:string,timestamp:string|null,signature:string|null,secret:string,now=Date.now()){
 if(secret.length<32||!timestamp||!/^\d{10}$/.test(timestamp)||Math.abs(now-Number(timestamp)*1000)>300000||!signature||!/^sha256=[a-f0-9]{64}$/.test(signature))return false;
 const expected=createHmac('sha256',secret).update(timestamp+'.'+raw).digest('hex');return timingSafeEqual(Buffer.from(expected),Buffer.from(signature.slice(7)));
}
export type {SmsProvider};
