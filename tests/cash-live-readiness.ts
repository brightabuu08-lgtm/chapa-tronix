import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';
import {db} from '../lib/db';
import {Prisma} from '../generated/prisma-v6';
import {businessSchema} from '../lib/business-config';
import {createOrder} from '../lib/orders';
import {confirmCod} from '../lib/maintenance';
const url=new URL(process.env.DATABASE_URL||'');if(url.pathname!=='/chapa_tronix_test'||url.port!=='55437')throw new Error('Test database only');
const id='live-cash-'+randomUUID(),saved=await db.storeSettings.findUnique({where:{id:'business'}}),env={SELLING_MODE:process.env.SELLING_MODE,NODE_ENV:process.env.NODE_ENV,CASH_ONLY:process.env.CASH_ONLY,CASH_ORDERS_OPEN:process.env.CASH_ORDERS_OPEN};let worker;
const fixture=businessSchema.parse({name:'Isolated shop fixture',email:'shop@example.test',phone:'+255712345678',deliveryDar:5000,pricesApproved:true,deliveryApproved:true,policiesApproved:true,taxMode:'EXCLUSIVE',taxRateBps:1800,...Object.fromEntries(['privacy','terms','returns','shipping'].map(key=>[key,'Isolated policy fixture describing the shop procedure for this test only.']))});
try{
 Object.assign(process.env,{SELLING_MODE:'live',NODE_ENV:'production',CASH_ONLY:'true',CASH_ORDERS_OPEN:'false'});
 await db.product.create({data:{id,slug:id,sku:id,name:'Live cash fixture',price:10000,stock:3,categoryId:'boards',brand:'QA',voltage:'5V',interface:'GPIO',images:['/images/esp32.jpg'],description:'Isolated readiness fixture',descriptionEn:'Isolated readiness fixture',specs:{},compatibility:'Test only'}});
 await db.storeSettings.upsert({where:{id:'business'},create:{id:'business',data:fixture},update:{data:fixture}});
 const payload={name:'Live readiness fixture',email:id+'@example.test',phone:'0712345678',region:'Dar es Salaam',street:'Isolated test location',delivery:'delivery',method:'cod',items:[{productId:id,quantity:1}],idempotencyKey:randomUUID()};
 const order=await createOrder(payload);assert.equal(order.method,'cod');assert.equal(order.total,16800);assert.equal(order.taxAmount,1800);assert.equal(order.shipping,5000);assert.equal((await db.product.findUniqueOrThrow({where:{id}})).stock,2);
 const duplicate=await createOrder(payload);assert.equal(duplicate.id,order.id);assert.equal((await db.product.findUniqueOrThrow({where:{id}})).stock,2);
 await assert.rejects(createOrder({...payload,method:'card',idempotencyKey:randomUUID()}),/Only cash/);
 await db.storeSettings.update({where:{id:'business'},data:{data:{...fixture,pricesApproved:false}}});await assert.rejects(createOrder({...payload,idempotencyKey:randomUUID()}),/Orders are not open/);await db.storeSettings.update({where:{id:'business'},data:{data:fixture}});
 const confirmed=await confirmCod(order.id,'test-only-admin');assert.equal(confirmed.status,'PACKED');assert.equal(confirmed.reservationExpiresAt,null);
 const expired=await createOrder({...payload,idempotencyKey:randomUUID()});await db.order.update({where:{id:expired.id},data:{reservationExpiresAt:new Date(Date.now()-1000)}});
 worker=spawn(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/order-worker.ts'],{env:{...process.env,MAIL_PROVIDER:'disabled',SMS_PROVIDER:'disabled',SMS_SEND_ENABLED:'false'},stdio:'ignore',windowsHide:true});
 let released=false;for(let i=0;i<50;i++){if((await db.order.findUniqueOrThrow({where:{id:expired.id}})).status==='CANCELLED'){released=true;break;}await setTimeout(200);}
 assert.ok(released,'running reservation worker releases expired cash orders');assert.equal((await db.product.findUniqueOrThrow({where:{id}})).stock,2);assert.equal((await db.order.findUniqueOrThrow({where:{id:order.id}})).status,'PACKED');assert.equal(await db.payment.count({where:{orderId:order.id}}),0);
 process.env.CASH_ORDERS_OPEN='true';
 const unfinished=businessSchema.parse({});await db.storeSettings.update({where:{id:'business'},data:{data:unfinished}});
 const pending=await createOrder({...payload,idempotencyKey:randomUUID()});assert.equal(pending.status,'PENDING');assert.equal(pending.method,'cod');assert.equal(pending.taxMode,'UNCONFIGURED');assert.equal(pending.taxAmount,0);assert.equal(((await db.storeSettings.findUniqueOrThrow({where:{id:'business'}})).data as Record<string,unknown>).policiesApproved,false);
 console.log(JSON.stringify({liveCashReadinessChecks:11,result:'passed',productionMode:true,businessWrites:0,scenarios:['live readiness gate','tax and shipping','cash only','idempotency','stock deduction','unapproved prices blocked','cash confirmation','automatic expired reservation release','confirmed order retained','no online payment','explicit cash activation accepts pending orders with unfinished business settings']}));
}finally{
 worker?.kill();if(saved)await db.storeSettings.upsert({where:{id:'business'},create:{id:'business',data:saved.data===null?Prisma.JsonNull:saved.data},update:{data:saved.data===null?Prisma.JsonNull:saved.data}});else await db.storeSettings.deleteMany({where:{id:'business'}});
 await db.emailJob.deleteMany({where:{recipient:id+'@example.test'}});await db.orderItem.deleteMany({where:{productId:id}});await db.order.deleteMany({where:{email:id+'@example.test'}});await db.inventoryMovement.deleteMany({where:{productId:id}});await db.product.deleteMany({where:{id}});for(const [key,value] of Object.entries(env)){if(value===undefined)delete process.env[key];else process.env[key]=value;}await db.$disconnect();
}
