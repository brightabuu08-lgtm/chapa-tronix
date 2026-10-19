import {assertIsolatedTestServer} from './isolated-server.mjs';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {randomUUID,randomInt} from 'node:crypto';
import {PrismaClient} from '../generated/prisma-v6/index.js';
const base=process.env.TEST_BASE_URL;
await assertIsolatedTestServer(base);
if(new URL(process.env.DATABASE_URL).pathname!=='/chapa_tronix_test')throw new Error('Isolated database required');
const db=new PrismaClient(),uid=randomUUID(),id='cash-'+uid,email=id+'@example.test',password='Cash-Test-Only-Password-1234',phone='07'+String(randomInt(100000000)).padStart(8,'0');
const headers={Origin:base,'Content-Type':'application/json'};
const browser=await chromium.launch({channel:'chrome',headless:true}),admin=await browser.newContext();
let customerId;
try{
 const login=await admin.request.post(base+'/api/auth/login',{headers,data:{identifier:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD}});assert.ok(login.ok());
 const fixture={id,slug:id,sku:id,name:'Cash checkout fixture',description:'Isolated cash checkout test item.',descriptionEn:'Isolated cash checkout test item.',price:12000,stock:5,categoryId:'boards',brand:'QA',voltage:'3.3V',interface:'GPIO',images:['/images/esp32.jpg'],specs:{},compatibility:'Test only'};
 const created=await admin.request.post(base+'/api/admin/products',{headers,data:fixture});assert.ok(created.ok(),await created.text());
 const settings=await (await admin.request.get(base+'/api/admin/settings')).json();
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.addInitScript(({id})=>{localStorage.setItem('ct-cart',JSON.stringify([{id,quantity:1}]));},{id});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/checkout');await page.getByRole('heading',{name:'Complete your order',exact:true}).waitFor();
 await page.locator('.checkout-layout input[name=name]').fill('Cash Test Customer');await page.locator('.checkout-layout input[name=phone]').fill(phone);await page.locator('.checkout-layout input[name=email]').fill(email);await page.locator('.checkout-layout textarea[name=street]').fill('Test delivery location in Dar es Salaam');await page.locator('.checkout-layout .check-label input').check();
 assert.equal(await page.locator('input[name=method]').count(),1);assert.equal(await page.locator('input[name=method]').inputValue(),'cod');
 await page.getByRole('button',{name:/Place order/}).click();await page.locator('.checkout-auth-dialog[open]').waitFor();
 await page.locator('.checkout-auth-dialog .login-tabs button').last().click();await page.locator('.checkout-auth-dialog input[name=name]').fill('Cash Test Customer');await page.locator('.checkout-auth-dialog input[name=email]').fill(email);await page.locator('.checkout-auth-dialog input[name=phone]').fill(phone);await page.locator('.checkout-auth-dialog input[name=password]').fill(password);
 const registered=page.waitForResponse(r=>r.url().endsWith('/api/auth/register')&&r.request().method()==='POST');await page.locator('.checkout-auth-dialog .login-submit').click();assert.equal((await registered).status(),201);await page.locator('.checkout-auth-dialog[open]').waitFor({state:'hidden'});
 assert.equal(new URL(page.url()).pathname,'/checkout');assert.equal(await page.locator('.checkout-layout textarea[name=street]').inputValue(),'Test delivery location in Dar es Salaam');
 const submitted=page.waitForResponse(r=>r.url().endsWith('/api/checkout')&&r.request().method()==='POST');await page.getByRole('button',{name:/Place order/}).click();const response=await submitted,result=await response.json();assert.equal(response.status(),201,JSON.stringify(result));assert.equal(result.paymentUrl,undefined);assert.equal(result.order.total,12000+settings.deliveryDar);await page.getByRole('heading',{name:'Order received',exact:true}).waitFor();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('ct-cart')).length),0);
 const persisted=await db.order.findUniqueOrThrow({where:{number:result.order.number}});customerId=persisted.userId;assert.equal(persisted.method,'cod');assert.equal(persisted.status,'PENDING');assert.equal(persisted.shipping,settings.deliveryDar);assert.equal((await db.product.findUniqueOrThrow({where:{id}})).stock,4);
 assert.equal(await db.payment.count({where:{orderId:persisted.id}}),0);assert.equal(await db.emailJob.count({where:{dedupeKey:'order:'+result.order.number+':PENDING'}}),1);
 const tracked=await context.request.post(base+'/api/orders/access',{headers,data:{number:result.order.number,token:result.accessToken}});assert.equal(tracked.status(),200);assert.equal((await tracked.json()).order.method,'cod');
 await page.goto(base+'/account');await page.locator('.order-card').filter({hasText:result.order.number}).waitFor();
 const payload={name:'Cash Test Customer',email,phone,region:'Dar es Salaam',street:'Test pickup location',delivery:'pickup',method:'cod',items:[{productId:id,quantity:1}],idempotencyKey:randomUUID()};
 const rejected=await context.request.post(base+'/api/checkout',{headers,data:{...payload,method:'mobile'}});assert.equal(rejected.status(),400);assert.equal((await db.product.findUniqueOrThrow({where:{id}})).stock,4);
 const pickup=await context.request.post(base+'/api/checkout',{headers,data:payload});assert.equal(pickup.status(),201,await pickup.text());const pickupResult=await pickup.json();assert.equal(pickupResult.order.total,12000);
 const confirmed=await admin.request.post(base+'/api/admin/confirm-cod/'+persisted.id,{headers,data:{}});assert.ok(confirmed.ok(),await confirmed.text());assert.equal((await db.order.findUniqueOrThrow({where:{id:persisted.id}})).confirmedAt instanceof Date,true);
 for(const status of ['SHIPPED','DELIVERED']){const updated=await admin.request.patch(base+'/api/admin/orders/'+persisted.id,{headers,data:{status}});assert.ok(updated.ok(),await updated.text());}
 const history=await context.request.get(base+'/api/account');assert.equal((await history.json()).orders.find(o=>o.number===result.order.number).status,'DELIVERED');assert.deepEqual(errors,[]);
 console.log(JSON.stringify({cashCheckoutChecks:17,result:'passed',scenarios:['mobile checkout','in-place real registration','draft retained','cash only UI','delivery totals','stock reservation','receipt','tracking','account history','no gateway call or payment record','notification queued','mobile payment rejected','pickup totals','admin confirmation','shipping','delivery','no browser errors'],businessWrites:0}));
 await context.close();
}finally{
 const orders=await db.order.findMany({where:{email},select:{id:true}}),ids=orders.map(o=>o.id);
 await db.smsJob.deleteMany({where:{orderId:{in:ids}}});await db.emailJob.deleteMany({where:{recipient:email}});await db.orderItem.deleteMany({where:{orderId:{in:ids}}});await db.order.deleteMany({where:{id:{in:ids}}});await db.inventoryMovement.deleteMany({where:{productId:id}});await db.product.deleteMany({where:{id}});
 if(customerId){await db.verificationToken.deleteMany({where:{userId:customerId}});await db.session.deleteMany({where:{userId:customerId}});await db.user.deleteMany({where:{id:customerId}});}
 await db.$disconnect();await browser.close();
}
