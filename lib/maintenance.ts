import {processSms,reconcileSms} from './sms';
import {db} from './db';
import {HttpError} from './auth';
import {retryTransaction} from './orders';
import {orderEmailTx,processEmails} from './mail';
import {reconcilePayments,reconcileRefunds} from './payment-lifecycle';
export async function releaseOrder(orderId:string,reason:string,actorId:string,now=new Date()){
 return retryTransaction(()=>db.$transaction(async tx=>{
  const order=await tx.order.findUnique({where:{id:orderId},include:{items:true}});if(!order||order.stockReleased||order.status!=='PENDING')return false;
  if(reason==='expired'&&(!order.reservationExpiresAt||order.reservationExpiresAt>now))return false;
  const changed=await tx.order.updateMany({where:{id:orderId,status:'PENDING',stockReleased:false},data:{status:'CANCELLED',stockReleased:true}});if(!changed.count)return false;
  for(const item of order.items){const data={stock:{increment:item.quantity},inventoryVersion:{increment:1}};if(item.variantId)await tx.variant.update({where:{id:item.variantId},data});else await tx.product.update({where:{id:item.productId},data});await tx.inventoryMovement.create({data:{productId:item.productId,variantId:item.variantId,delta:item.quantity,reason:'Reservation '+reason+' '+order.number,actorId}});}
  if(order.couponCode)await tx.coupon.updateMany({where:{code:order.couponCode,used:{gt:0}},data:{used:{decrement:1}}});
  await tx.auditLog.create({data:{userId:actorId,action:'RESERVATION_'+reason.toUpperCase(),target:orderId}});await orderEmailTx(tx,{...order,status:'CANCELLED'});return true;
 },{isolationLevel:'Serializable'}));
}
export async function confirmCod(orderId:string,actorId:string){return retryTransaction(()=>db.$transaction(async tx=>{const order=await tx.order.findUniqueOrThrow({where:{id:orderId}});if(order.method!=='cod'||order.status!=='PENDING'||order.stockReleased||!order.reservationExpiresAt||order.reservationExpiresAt<=new Date())throw new HttpError(409,'Reservation expired or cannot be confirmed.');const updated=await tx.order.update({where:{id:orderId},data:{confirmedAt:new Date(),reservationExpiresAt:null,status:'PACKED'}});await tx.auditLog.create({data:{userId:actorId,action:'COD_CONFIRMED',target:orderId}});await orderEmailTx(tx,updated);return updated;},{isolationLevel:'Serializable'}));}
export async function expireReservations(now=new Date()){const rows=await db.order.findMany({where:{status:'PENDING',stockReleased:false,reservationExpiresAt:{lte:now}},select:{id:true},take:100});let expired=0;for(const row of rows)if(await releaseOrder(row.id,'expired','worker',now))expired++;return expired;}
export async function runMaintenance(){const payments=await reconcilePayments(),refunds=await reconcileRefunds(),expired=await expireReservations(),now=new Date();await db.session.deleteMany({where:{expiresAt:{lt:now}}});await db.verificationToken.deleteMany({where:{expiresAt:{lt:now}}});await db.rateLimit.deleteMany({where:{resetAt:{lt:now}}});const result={expired,payments,refunds,...await processEmails(),...await processSms(),...await reconcileSms()};await db.workerHeartbeat.upsert({where:{id:'maintenance'},create:{id:'maintenance',lastSuccessAt:now,result},update:{lastSuccessAt:now,result}});return result;}
