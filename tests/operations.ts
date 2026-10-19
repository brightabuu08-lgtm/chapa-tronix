import {assertIsolatedTestServer} from './isolated-server.mjs';
import assert from 'node:assert/strict';
import {randomUUID,randomInt} from 'node:crypto';
import {db} from '../lib/db';
import {expireReservations} from '../lib/maintenance';
import {queueEmail,processEmails} from '../lib/mail';
if(new URL(process.env.DATABASE_URL||'').pathname!=='/chapa_tronix_test')throw new Error('Use the isolated test database.');
const base=process.env.TEST_BASE_URL||'http://localhost:3107',id='qa-operations-'+randomUUID().slice(0,20),email=id+'@example.com',password='Operations-Test-Password-12345',phone='07'+String(randomInt(100000000)).padStart(8,'0');let cookie='',passed=0,customerId='';
await assertIsolatedTestServer(base);
const check=(v:unknown,label:string)=>{assert.ok(v,label);passed++;console.log('PASS '+label)};
async function api(path:string,body?:unknown,method='POST'){const r=await fetch(base+'/api/'+path,{method,headers:{Origin:base,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {r,d:await r.json()};}
const product={id,slug:id,name:'QA Discount and Variant',sku:id,price:36000,oldPrice:45000,stock:0,categoryId:'boards',brand:'QA',voltage:'3.3V',interface:'GPIO',images:['/images/esp32.jpg'],specs:{Voltage:'3.3V'},description:'Bidhaa ya kupima punguzo na aina za bidhaa.',descriptionEn:'Temporary discount and variant test product.',compatibility:'Temporary QA data'};
try{
 let result=await api('auth/login',{identifier:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD});check(result.r.ok,'administrator signs in');cookie=result.r.headers.get('set-cookie')!.split(';')[0];const adminCookie=cookie;
 result=await api('admin/products',product);check(result.r.ok,'discounted product is saved');
 result=await api('admin/products/'+id,{...product,oldPrice:35000},'PATCH');check(result.r.status===400,'regular price below sale price is rejected');
 result=await api('admin/variants',{productId:id,name:'Cable included',sku:id+'-variant',price:40000,oldPrice:50000,stock:2});check(result.r.status===201,'variant has separate regular and sale prices');const variantId=result.d.id;
 result=await api('admin/coupons',{code:id.toUpperCase(),percent:10,minimum:0,limit:5,expiresAt:new Date(Date.now()+86400000).toISOString(),active:true});check(result.r.ok,'coupon is created');
 cookie='';result=await api('auth/register',{name:'Operations Customer',email,password,phone});check(result.r.status===201,'customer signs up');cookie=result.r.headers.get('set-cookie')!.split(';')[0];customerId=result.d.user.id;
 result=await api('wishlist',{productId:id});check(result.r.ok,'wishlist saves to account');result=await api('wishlist',{productId:id},'DELETE');check(result.r.ok,'wishlist item can be removed');
 const checkout={name:'Operations Customer',email,phone,region:'Dar es Salaam',street:'QA pickup address',delivery:'pickup',method:'cod',coupon:id.toUpperCase(),items:[{productId:id,variantId,quantity:2}],idempotencyKey:randomUUID()};
 result=await api('checkout',checkout);check(result.r.status===201&&result.d.order.total===72000,'checkout uses variant price and coupon on the server');
 const order=await db.order.findUniqueOrThrow({where:{number:result.d.order.number}});check((await db.variant.findUniqueOrThrow({where:{id:variantId}})).stock===0,'variant stock is deducted separately');
 cookie=adminCookie;result=await api('admin/orders/'+order.id,{tracking:'QA track number'},'PATCH');check(result.r.ok,'tracking can be saved without changing status');
 result=await api('admin/orders/'+order.id,{status:'CANCELLED'},'PATCH');check(result.r.ok,'cancellation succeeds');check((await db.variant.findUniqueOrThrow({where:{id:variantId}})).stock===2,'cancellation restores variant stock');check((await db.coupon.findUniqueOrThrow({where:{code:id.toUpperCase()}})).used===0,'cancellation releases coupon usage');
 await db.order.update({where:{id:order.id},data:{status:'PENDING',method:'mobile',stockReleased:false,reservationExpiresAt:new Date(Date.now()-1000)}});await db.variant.update({where:{id:variantId},data:{stock:0}});await db.coupon.update({where:{code:id.toUpperCase()},data:{used:1}});
 check(await expireReservations()>=1,'worker expires unpaid online reservations');await expireReservations();check((await db.variant.findUniqueOrThrow({where:{id:variantId}})).stock===2,'worker restores stock exactly once');
 const job=await queueEmail(email,'QA dedupe','Test message',id);const duplicate=await queueEmail(email,'QA dedupe','Test message',id);check(job.id===duplicate.id,'email notifications are idempotent');check((await processEmails()).pendingOnly,'missing mail credentials keep messages queued');
 result=await api('auth/recovery',{action:'request-reset',email});check(result.r.ok,'password recovery returns a generic response');const reset=await db.emailJob.findFirstOrThrow({where:{recipient:email,text:{contains:'/reset-password#token='}},orderBy:{createdAt:'desc'}});const token=reset.text.match(/token=([^\s]+)/)![1];
 result=await api('auth/recovery',{action:'reset',token,password:password+'-new'});check(result.r.ok,'one-time reset link updates the password');result=await api('auth/recovery',{action:'reset',token,password});check(result.r.status===400,'used reset link is rejected');
 cookie='';result=await api('auth/login',{identifier:email,password});check(result.r.status===401,'old password stops working');result=await api('auth/login',{identifier:email,password:password+'-new'});check(result.r.ok,'new password signs in');cookie=result.r.headers.get('set-cookie')!.split(';')[0];
 result=await api('auth/recovery',{action:'request-verify'});check(result.r.ok,'signed-in customer can request verification');const verification=await db.emailJob.findFirstOrThrow({where:{recipient:email,text:{contains:'/verify-email#token='}},orderBy:{createdAt:'desc'}});const verifyToken=verification.text.match(/token=([^\s]+)/)![1];result=await api('auth/recovery',{action:'verify',token:verifyToken});check(result.r.ok,'email verification link is accepted');check(!!(await db.user.findUniqueOrThrow({where:{id:customerId}})).emailVerifiedAt,'verification timestamp is persisted');result=await api('auth/recovery',{action:'verify',token:verifyToken});check(result.r.status===400,'verification link cannot be reused');
 result=await api('newsletter',{email,consent:false});check(result.r.status===400,'newsletter requires explicit consent');
 result=await api('newsletter',{email,consent:true});check(result.r.ok,'newsletter opt-in is stored');result=await api('newsletter',{email,action:'unsubscribe'});check(result.r.ok&&!(await db.newsletterSubscriber.findUniqueOrThrow({where:{email}})).active,'newsletter unsubscribe disables the subscription');
 console.log(JSON.stringify({operationsChecks:passed,result:'passed'}));
}finally{
 await db.newsletterSubscriber.deleteMany({where:{email}});await db.emailJob.deleteMany({where:{recipient:email}});await db.orderItem.deleteMany({where:{productId:id}});await db.order.deleteMany({where:{email}});await db.inventoryMovement.deleteMany({where:{productId:id}});await db.wishlist.deleteMany({where:{productId:id}});await db.variant.deleteMany({where:{productId:id}});await db.product.deleteMany({where:{id}});await db.coupon.deleteMany({where:{code:id.toUpperCase()}});if(customerId){await db.verificationToken.deleteMany({where:{userId:customerId}});await db.session.deleteMany({where:{userId:customerId}});await db.user.delete({where:{id:customerId}});}await db.$disconnect();
}
