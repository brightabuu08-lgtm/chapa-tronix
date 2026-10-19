import {db} from './db';
import {HttpError,tokenHash} from './auth';
import {initiatePayment,verifyPayment,paymentsEnabled} from './payments';
import {orderEmailTx} from './mail';
import {businessSettings} from './business';
import {assertSellingMode} from './selling-mode';
import {retryTransaction} from './orders';
import {z} from 'zod';
const verifiedSchema=z.object({id:z.union([z.string(),z.number()]),tx_ref:z.string(),status:z.string(),currency:z.string(),amount:z.coerce.number().int().nonnegative()});
export async function applyVerifiedPayment(payload:unknown){
 const v=verifiedSchema.parse(payload);if(v.status!=='successful')return {applied:false};
 return retryTransaction(()=>db.$transaction(async tx=>{
  const attempt=await tx.paymentAttempt.findUnique({where:{reference:v.tx_ref}});
  const order=await tx.order.findUnique({where:{number:v.tx_ref}});
  if(!order||v.currency!=='TZS'||v.amount!==order.total)throw new HttpError(400,'Payment mismatch.');
  const reference=String(v.id),existing=await tx.payment.findUnique({where:{reference}});
  if(existing){if(existing.orderId!==order.id)throw new HttpError(409,'Transaction reference already belongs to another order.');return {applied:false};}
  const alreadyPaid=await tx.payment.count({where:{orderId:order.id,resolution:'APPLIED'}});
  const late=order.stockReleased||['CANCELLED','REFUNDED'].includes(order.status)||alreadyPaid>0;
  await tx.payment.create({data:{orderId:order.id,provider:'flutterwave',reference,amount:order.total,status:'PAID',resolution:late?'REVIEW_REQUIRED':'APPLIED'}});
  if(attempt)await tx.paymentAttempt.update({where:{id:attempt.id},data:{status:late?'REVIEW_REQUIRED':'PAID',transactionId:reference}});
  if(!late&&order.status==='PENDING'){const changed=await tx.order.update({where:{id:order.id},data:{status:'PAID',reservationExpiresAt:null}});await orderEmailTx(tx,changed);}
  if(late)await tx.auditLog.create({data:{userId:'gateway',action:'PAYMENT_REVIEW_REQUIRED',target:order.id}});
  return {applied:true,reviewRequired:late};
 },{isolationLevel:'Serializable'}));
}
export async function resumePayment(orderId:string){
 assertSellingMode(await businessSettings());
 const order=await db.order.findUniqueOrThrow({where:{id:orderId}});
 if(order.method==='cod'||order.status!=='PENDING'||order.stockReleased||!order.reservationExpiresAt||order.reservationExpiresAt<=new Date())throw new HttpError(409,'This order cannot resume payment.');
 if(!paymentsEnabled())throw new HttpError(503,'Online payments are not configured.');
 let attempt=await db.paymentAttempt.findUnique({where:{reference:order.number}});
 if(attempt?.url&&attempt.status==='READY')return attempt.url;
 if(attempt)throw new HttpError(409,'Payment initiation is being checked. Your order is saved; do not create another order.');
 try{attempt=await db.paymentAttempt.create({data:{orderId,reference:order.number,status:'INITIATING'}});}catch{throw new HttpError(409,'Payment request already in progress.');}
 try{const url=await initiatePayment(order);await db.paymentAttempt.update({where:{id:attempt.id},data:{url,status:'READY'}});return url;}
 catch(error){await db.paymentAttempt.update({where:{id:attempt.id},data:{status:'UNCERTAIN'}});throw error;}
}
async function providerGet(endpoint:string){const r=await fetch('https://api.flutterwave.com/v3/'+endpoint,{headers:{Authorization:'Bearer '+process.env.FLUTTERWAVE_SECRET_KEY},signal:AbortSignal.timeout(15000)});if(!r.ok)throw new HttpError(502,'Provider verification unavailable.');return (await r.json()).data;}
export async function reconcilePayments(limit=20){
 if(!paymentsEnabled())return {checked:0,disabled:true};
 const rows=await db.paymentAttempt.findMany({where:{status:{in:['READY','UNCERTAIN','INITIATING']},nextCheckAt:{lte:new Date()}},orderBy:{nextCheckAt:'asc'},take:limit});let checked=0;
 for(const row of rows){try{const verified=row.transactionId?await verifyPayment(row.transactionId):await providerGet('transactions/verify_by_reference?tx_ref='+encodeURIComponent(row.reference));if(verified?.status==='successful')await applyVerifiedPayment(verified);checked++;}catch{/* Retain the attempt: provider outages must not lose payments. */}finally{await db.paymentAttempt.update({where:{id:row.id},data:{checks:{increment:1},nextCheckAt:new Date(Date.now()+Math.min(3600000,60000*2**Math.min(row.checks,6)))}});}}
 return {checked,disabled:false};
}
export async function requestRefund(input:unknown,actorId:string){
 const data=z.object({paymentReference:z.string().max(100),reason:z.string().min(5).max(500),providerReference:z.string().max(100).optional()}).parse(input);
 const payment=await db.payment.findUnique({where:{reference:data.paymentReference}});if(!payment||payment.status!=='PAID')throw new HttpError(404,'Verified payment not found.');
 return retryTransaction(()=>db.$transaction(async tx=>{const existing=await tx.refund.findUnique({where:{paymentReference:payment.reference}});if(existing?.status==='COMPLETED')throw new HttpError(409,'Refund already completed.');if(existing?.providerReference&&data.providerReference&&existing.providerReference!==data.providerReference)throw new HttpError(409,'Refund provider reference cannot be replaced.');const refund=await tx.refund.upsert({where:{paymentReference:payment.reference},create:{orderId:payment.orderId,paymentReference:payment.reference,amount:payment.amount,reason:data.reason,actorId,providerReference:data.providerReference,status:data.providerReference?'VERIFYING':'REQUESTED'},update:data.providerReference?{providerReference:data.providerReference,status:'VERIFYING'}:{}});if(refund.status==='COMPLETED')throw new HttpError(409,'Refund already completed.');await tx.auditLog.create({data:{userId:actorId,action:'REFUND_REVIEW',target:refund.id}});return refund;},{isolationLevel:'Serializable'}));
}
export async function applyVerifiedRefund(refundId:string,payload:unknown){
 const v=z.object({id:z.union([z.string(),z.number()]),transaction_id:z.union([z.string(),z.number()]),amount_refunded:z.coerce.number(),currency:z.literal('TZS'),status:z.string()}).parse(payload);
 return retryTransaction(()=>db.$transaction(async tx=>{const refund=await tx.refund.findUniqueOrThrow({where:{id:refundId}});if(refund.status==='COMPLETED')return false;
 if(String(v.id)!==refund.providerReference||String(v.transaction_id)!==refund.paymentReference||v.amount_refunded!==refund.amount)throw new HttpError(400,'Refund mismatch.');
 if(!['completed','successful'].includes(v.status.toLowerCase()))return false;
 await tx.refund.update({where:{id:refundId},data:{status:'COMPLETED'}});await tx.payment.update({where:{reference:refund.paymentReference},data:{status:'REFUNDED',resolution:'REFUNDED'}});
 const remaining=await tx.payment.count({where:{orderId:refund.orderId,status:'PAID',resolution:'APPLIED'}});const order=await tx.order.findUniqueOrThrow({where:{id:refund.orderId}});
 if(!remaining&&order.status!=='CANCELLED'){const updated=await tx.order.update({where:{id:order.id},data:{status:'REFUNDED'}});await orderEmailTx(tx,updated);}
 await tx.auditLog.create({data:{userId:'gateway',action:'REFUND_CONFIRMED',target:refundId}});return true;
 },{isolationLevel:'Serializable'}));
}
export async function reconcileRefunds(){if(!paymentsEnabled())return 0;const rows=await db.refund.findMany({where:{status:'VERIFYING',providerReference:{not:null}},take:20});let completed=0;for(const row of rows)try{if(await applyVerifiedRefund(row.id,await providerGet('refunds/'+encodeURIComponent(row.providerReference!))))completed++;}catch{}return completed;}
export async function accessibleOrder(number:string,token:string|undefined,user:{id:string;role:string}|null){const order=await db.order.findUnique({where:{number},include:{items:true}});if(!order)throw new HttpError(404,'Order not found.');const owner=user&&(user.role!=='CUSTOMER'||order.userId===user.id);if(!owner&&(!token||token.length>100||!order.accessTokenHash||tokenHash(token)!==order.accessTokenHash))throw new HttpError(404,'Order not found.');return order;}
