import {createHash} from 'node:crypto';
import {db} from './db';
import type {Prisma} from '../generated/prisma-v6';
import {defaultSmsSettings,smsSettingsSchema,smsComposeSchema,smsPhone,smsSize,smsTextSchema,smsTemplate,smsReceiptSchema,type SmsReceipt} from './sms-contract';
import {smsConfiguration,submitSms,lookupCustomSms,SmsDeliveryError} from './sms-provider';
import {HttpError} from './auth';

async function retrySms<T>(work:()=>Promise<T>):Promise<T>{for(let attempt=0;attempt<4;attempt++){try{return await work();}catch(error){if(!error||typeof error!=='object'||!('code' in error)||!['P2002','P2034'].includes(String(error.code))||attempt===3)throw error;}}throw new HttpError(409,'SMS conflict; refresh and retry.');}
export async function smsSettings(tx:Prisma.TransactionClient=db){const row=await tx.storeSettings.findUnique({where:{id:'sms'}});const parsed=smsSettingsSchema.safeParse(row?.data);return parsed.success?parsed.data:defaultSmsSettings;}
export async function saveSmsSettings(input:unknown,actorId:string){const value=smsSettingsSchema.parse(input);return db.$transaction(async tx=>{await tx.storeSettings.upsert({where:{id:'sms'},create:{id:'sms',data:value},update:{data:value}});await tx.auditLog.create({data:{userId:actorId,action:'SMS_SETTINGS_SAVE',target:'sms'}});return value;});}
async function queueTx(tx:Prisma.TransactionClient,input:{dedupeKey:string;recipient:string;text:string;actorId:string;orderId?:string;orderStatus?:string}){
 const recipient=smsPhone(input.recipient),text=smsTextSchema.parse(input.text),size=smsSize(text);
 const fingerprint=createHash('sha256').update(JSON.stringify({recipient,text})).digest('hex');
 // Preserve the provider/sender snapshot on retries, including after a provider switch.
 const existing=await tx.smsJob.findUnique({where:{dedupeKey:input.dedupeKey}});if(existing){if(existing.fingerprint!==fingerprint)throw new HttpError(409,'Taarifa za SMS zimebadilika. Anza ujumbe mpya / SMS details changed; start a new message.');return existing;}
 const config=smsConfiguration();if(!config.enabled)throw new HttpError(503,'SMS zimezimwa au hazijasanidiwa / SMS sending is disabled or not configured.');
 if(config.provider==='beem'&&size.encoding!=='GSM7')throw new HttpError(400,'Tumia herufi za kawaida kwa SMS za Beem / Use GSM-compatible text for this adapter.');
 return tx.smsJob.create({data:{...input,recipient,text,encoding:size.encoding,segments:size.segments,fingerprint,provider:config.provider,sender:config.sender||'MOCK',expiresAt:new Date(Date.now()+86400000)}});
}
export async function composeSms(input:unknown,actorId:string){const value=smsComposeSchema.parse(input);return retrySms(()=>db.$transaction(async tx=>{const job=await queueTx(tx,{dedupeKey:'manual:'+actorId+':'+value.requestId,recipient:value.recipient,text:value.text,actorId});await tx.auditLog.create({data:{userId:actorId,action:'SMS_QUEUE',target:job.id}});return job;},{isolationLevel:'Serializable'}));}
export async function orderSmsTx(tx:Prisma.TransactionClient,order:{id?:string;phone?:string;number:string;status:string;delivery?:string}){
 if(!smsConfiguration().enabled||!order.id||!order.phone)return;
 const settings=await smsSettings(tx);if(!settings.orderNotifications||!settings.statuses.includes(order.status as typeof settings.statuses[number]))return;
 let recipient:string;try{recipient=smsPhone(order.phone);}catch{return;}
 const text=smsTemplate(order.status,order,settings.language);if(!text)return;
 await queueTx(tx,{dedupeKey:'order:'+order.id+':'+order.status,recipient,text,actorId:'order-notification',orderId:order.id,orderStatus:order.status});
}
export async function applySmsReceipt(input:unknown){const receipt=smsReceiptSchema.parse(input);return retrySms(()=>db.$transaction(async tx=>{
 const job=await tx.smsJob.findUnique({where:{id:receipt.clientReference}});
 if(!job||job.provider!=='custom')throw new HttpError(404,'SMS haijapatikana / SMS not found.');
 if(job.providerMessageId&&job.providerMessageId!==receipt.messageId)throw new HttpError(409,'SMS reference mismatch.');
 const seen=await tx.smsEvent.findUnique({where:{jobId_providerEventId:{jobId:job.id,providerEventId:receipt.eventId}}});
 if(seen){if(seen.status!==receipt.status)throw new HttpError(409,'SMS event mismatch.');return {applied:false};}
 await tx.smsEvent.create({data:{jobId:job.id,providerEventId:receipt.eventId,status:receipt.status}});
 // Delivery success/failure is terminal; stale ACCEPTED callbacks cannot overwrite it.
 if(['DELIVERED','CANCELLED'].includes(job.status)||job.status==='FAILED'&&job.providerMessageId)return {applied:false};
 const status=receipt.status==='UNDELIVERABLE'?'FAILED':receipt.status;
 await tx.smsJob.update({where:{id:job.id},data:{status,providerMessageId:receipt.messageId,lockedAt:null,lastError:status==='FAILED'?'Delivery rejected by provider.':null,acceptedAt:job.acceptedAt||new Date(),...(status==='DELIVERED'?{deliveredAt:new Date()}:{}),nextAttemptAt:new Date(Date.now()+300000)}});
 return {applied:true};
 },{isolationLevel:'Serializable'}));}
export async function processSms(limit=20){
 const config=smsConfiguration();if(!config.enabled)return {smsAccepted:0,smsDisabled:true};
 const now=new Date();
 await db.smsJob.updateMany({where:{status:'SENDING',lockedAt:{lt:new Date(Date.now()-300000)}},data:{status:'UNCERTAIN',lockedAt:null,lastError:'Worker stopped during submission; verify provider before retrying.'}});
 const jobs=await db.smsJob.findMany({where:{status:'QUEUED',provider:config.provider,nextAttemptAt:{lte:now},attempts:{lt:5}},orderBy:[{createdAt:'asc'},{id:'asc'}],take:limit});let smsAccepted=0;
 for(const job of jobs){
  if(job.expiresAt<=now||(job.orderId&&job.orderStatus&&(await db.order.findUnique({where:{id:job.orderId},select:{status:true}}))?.status!==job.orderStatus)){
   await db.smsJob.updateMany({where:{id:job.id,status:'QUEUED'},data:{status:'CANCELLED',lastError:'Expired or superseded order notification.'}});continue;
  }
  const claim=await db.smsJob.updateMany({where:{id:job.id,status:'QUEUED',attempts:job.attempts},data:{status:'SENDING',lockedAt:new Date(),attempts:{increment:1}}});if(!claim.count)continue;
  try{const reference=await submitSms(job);await db.smsJob.updateMany({where:{id:job.id,status:'SENDING'},data:{status:'ACCEPTED',providerMessageId:reference,acceptedAt:new Date(),lockedAt:null,lastError:null,nextAttemptAt:new Date(Date.now()+60000)}});smsAccepted++;}
  catch(error){const kind=error instanceof SmsDeliveryError?error.kind:'uncertain';const retry=kind==='throttled'&&job.attempts+1<5;await db.smsJob.updateMany({where:{id:job.id,status:'SENDING'},data:{status:retry?'QUEUED':kind==='uncertain'?'UNCERTAIN':'FAILED',lockedAt:null,lastError:kind==='uncertain'?'Submission outcome unknown; provider verification required.':kind==='configuration'?'Provider configuration changed; restore it before retrying.':kind==='throttled'?'Provider rate limit reached.':'Provider rejected the submission.',nextAttemptAt:new Date(Date.now()+Math.min(3600000,60000*2**job.attempts))}});}
 }
 return {smsAccepted,smsDisabled:false};
}
export async function reconcileSms(limit=20){
 const config=smsConfiguration();if(!config.enabled||config.provider!=='custom')return {smsChecked:0};
 const jobs=await db.smsJob.findMany({where:{provider:'custom',status:{in:['ACCEPTED','UNCERTAIN']},nextAttemptAt:{lte:new Date()}},orderBy:{nextAttemptAt:'asc'},take:limit});let smsChecked=0;
 for(const job of jobs){try{const value=await lookupCustomSms(job.id);const receipt:SmsReceipt=smsReceiptSchema.parse(value);if(receipt.clientReference!==job.id)throw new Error('Reference mismatch');await applySmsReceipt(receipt);smsChecked++;}catch{/* Unknown submission outcomes are never resent automatically. */}finally{await db.smsJob.updateMany({where:{id:job.id,status:{in:['ACCEPTED','UNCERTAIN']}},data:{nextAttemptAt:new Date(Date.now()+300000)}});}}
 return {smsChecked};
}
export async function smsAction(id:string,action:'cancel'|'retry',actorId:string){return retrySms(()=>db.$transaction(async tx=>{
 const job=await tx.smsJob.findUnique({where:{id}});if(!job)throw new HttpError(404,'SMS haijapatikana / SMS not found.');
 if(action==='cancel'){if(job.status!=='QUEUED')throw new HttpError(409,'Ni SMS inayosubiri pekee inaweza kuzuiwa / Only queued SMS can be cancelled.');}
 else{if(job.status!=='FAILED'||job.providerMessageId||job.attempts>=5||job.expiresAt<=new Date())throw new HttpError(409,'SMS hii haiwezi kutumwa tena salama / This SMS cannot be safely retried.');const config=smsConfiguration();if(!config.enabled||config.provider!==job.provider)throw new HttpError(503,'SMS provider is unavailable.');}
 const result=await tx.smsJob.updateMany({where:{id,status:job.status,attempts:job.attempts},data:{status:action==='cancel'?'CANCELLED':'QUEUED',lastError:null,nextAttemptAt:new Date()}});if(!result.count)throw new HttpError(409,'SMS changed; refresh first.');
 await tx.auditLog.create({data:{userId:actorId,action:'SMS_'+action.toUpperCase(),target:id}});return {ok:true};
 },{isolationLevel:'Serializable'}));}
