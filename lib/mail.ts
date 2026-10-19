import {db} from './db';
import {deliverEmail,mailConfigured} from './mail-transport';
import {orderSmsTx} from './sms';
export {mailConfigured} from './mail-transport';
import {createHash} from 'node:crypto';
import type {Prisma} from '../generated/prisma-v6';
export async function orderEmailTx(tx:Prisma.TransactionClient,order:{id?:string;phone?:string;delivery?:string;email:string;name:string;number:string;status:string;total:number}){await orderSmsTx(tx,order);const dedupeKey='order:'+order.number+':'+order.status;await tx.emailJob.upsert({where:{dedupeKey},update:{},create:{dedupeKey,recipient:order.email.toLowerCase(),subject:'chapa tronix — '+order.number,text:`Habari ${order.name},\nOda ${order.number}\nHali / Status: ${order.status}\nJumla / Total: TZS ${order.total}\nAngalia taarifa za oda kwenye akaunti au tumia kiungo cha kufuatilia oda ulichohifadhi.`}});}
export async function queueEmail(recipient:string,subject:string,text:string,dedupeKey?:string){const data={recipient:recipient.toLowerCase(),subject,text,dedupeKey};return dedupeKey?db.emailJob.upsert({where:{dedupeKey},create:data,update:{}}):db.emailJob.create({data});}
export async function processEmails(limit=20,jobId?:string){
 if(!mailConfigured())return {sent:0,pendingOnly:true};
 await db.emailJob.updateMany({where:{status:'SENDING',lockedAt:{lt:new Date(Date.now()-300000)},...(jobId?{id:jobId}:{})},data:{status:'PENDING',lockedAt:null}});
 const jobs=await db.emailJob.findMany({where:{status:'PENDING',attempts:{lt:5},...(jobId?{id:jobId}:{})},orderBy:{createdAt:'asc'},take:limit});let sent=0;
 for(const job of jobs){
  const legacyAccount=job.subject.includes('Verify email')||job.subject.includes('Reset password');
  const raw=legacyAccount?job.text.match(/(?:verify-email|reset-password)[?#]token=([A-Za-z0-9_-]+)/)?.[1]:undefined;
  const tokenId=job.dedupeKey?.startsWith('account:')?job.dedupeKey.split(':').at(-1):raw?createHash('sha256').update(raw).digest('hex'):undefined;
  if(tokenId){const token=await db.verificationToken.findUnique({where:{id:tokenId}});if(!token||token.usedAt||token.expiresAt<=new Date()){await db.emailJob.updateMany({where:{id:job.id,status:'PENDING'},data:{status:'CANCELLED',lastError:'Account link expired or superseded.'}});continue;}}

  const claimed=await db.emailJob.updateMany({where:{id:job.id,status:'PENDING',attempts:{lt:5}},data:{status:'SENDING',lockedAt:new Date(),attempts:{increment:1}}});if(!claimed.count)continue;
  try{await deliverEmail(job);await db.emailJob.update({where:{id:job.id},data:{status:'SENT',sentAt:new Date(),lastError:null}});sent++;}
  catch{await db.emailJob.update({where:{id:job.id},data:{status:job.attempts+1>=5?'FAILED':'PENDING',lockedAt:null,lastError:'Delivery unavailable; retry pending.'}});}
 }
 return {sent,pendingOnly:false};
}
export async function orderEmail(order:{email:string;name:string;number:string;status:string;total:number}){
 await queueEmail(order.email,'chapa tronix · '+order.number,`Habari ${order.name},\n\nOda ${order.number}\nHali / Status: ${order.status}\nJumla / Total: TZS ${order.total.toLocaleString('en-TZ')}\n\nKupokea oda si uthibitisho wa malipo. / An order acknowledgement is not payment confirmation.\nFuatilia oda / View your order: ${process.env.APP_URL}/account\n\nchapa tronix`,'order:'+order.number+':'+order.status).catch(()=>console.error('order_email_queue_unavailable'));
}
