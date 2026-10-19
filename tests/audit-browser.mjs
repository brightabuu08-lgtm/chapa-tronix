import {assertIsolatedTestServer} from './isolated-server.mjs';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {PrismaClient} from '../generated/prisma-v6/index.js';
import {createHash,randomUUID} from 'node:crypto';

const database=process.env.DATABASE_URL;
if(!database||new URL(database).pathname!=='/chapa_tronix_test')throw new Error('Browser writes require the isolated test database.');
const base=process.env.TEST_BASE_URL||'http://localhost:3107';
await assertIsolatedTestServer(base);

const db=new PrismaClient({datasourceUrl:database}),uid=randomUUID(),productId='audit-ui-'+uid;
const password='Browser-Audit-Test-Password-12345',firstEmail='browser-audit-'+uid+'@example.test';
const product=await db.product.create({data:{id:productId,slug:productId,sku:productId,name:'Audit browser kit '+uid.slice(0,6),price:2000,oldPrice:2500,stock:5,categoryId:'boards',brand:'QA',description:'Vifaa kwa majaribio ya website pekee.',descriptionEn:'Test database fixture only.',images:['/images/esp32.jpg'],specs:{Voltage:'3.3V'},compatibility:'3.3V supply only',voltage:'3.3V',interface:'GPIO'}});
const browser=await chromium.launch({channel:process.env.CI?undefined:'chrome',headless:true,args:['--disable-background-networking']});let checks=0;
function pass(label){checks++;console.log('PASS browser '+label);}
try{
 const context=await browser.newContext({viewport:{width:360,height:800},hasTouch:true,isMobile:true,acceptDownloads:true});
 const page=await context.newPage();page.setDefaultTimeout(45000);page.setDefaultNavigationTimeout(120000);const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error'&&/hydrat|didn't match/i.test(message.text()))errors.push(message.text())});
 await page.goto(base+'/account');
 await page.locator('.auth-card form .button.orange').click();
 assert.ok(await page.locator('.auth-card [aria-invalid=true]').count());pass('empty forms provide inline validation');
 async function register(email){
  await page.getByRole('button',{name:'Fungua akaunti',exact:true}).first().click();
  const form=page.locator('.auth-card form');
  await form.locator('[name=name]').fill('Browser Audit Customer');await form.locator('[name=email]').fill(email);
  await form.locator('[name=phone]').fill('07'+String(Math.floor(Math.random()*90000000)+10000000));
  await form.locator('[name=password]').fill(password);await form.getByRole('button',{name:'Fungua akaunti',exact:true}).click();
  await page.getByRole('button',{name:'Toka',exact:true}).waitFor();
 }
 await register(firstEmail);pass('new customer completes registration');
 await page.goto(base+'/shop');
 let fail=true;const outage='audit-outage-'+uid;
 await page.route('**/api/catalog?*',async route=>{if(new URL(route.request().url()).searchParams.get('q')===outage&&fail){fail=false;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Huduma ya majaribio haipatikani / Test service unavailable'})});}else await route.continue();});
 await page.locator('.catalog-search input').fill(outage);
 await page.getByRole('alert').filter({hasText:'Huduma ya majaribio'}).waitFor();
 await page.getByRole('button',{name:'Jaribu tena',exact:true}).click();
 await page.getByRole('heading',{name:'Hakuna bidhaa hapa bado',exact:true}).waitFor();pass('failed catalog request can be retried');
 await page.goto(base+'/product/'+product.slug);
 await page.getByRole('button',{name:'Weka kikapuni',exact:true}).click();
 await page.goto(base+'/checkout');const form=page.locator('.checkout-layout form');
 await form.locator('[name=name]').fill('Browser Audit Customer');await form.locator('[name=email]').fill(firstEmail);
 const phone='07'+String(Math.floor(Math.random()*90000000)+10000000);await form.locator('[name=phone]').fill(phone);
 await form.locator('[name=street]').fill('Audit address preserved after refresh');
 await page.reload();await page.locator('.checkout-layout form [name=street]').waitFor();
 await page.waitForFunction(()=>document.querySelector('.checkout-layout [name=street]')?.value==='Audit address preserved after refresh');
 pass('checkout refresh restores the unsent draft');
 await page.locator('.checkout-layout .choice-row input').nth(1).check();
 await page.locator('.checkout-layout form input[type=checkbox]').check();
 await page.locator('.checkout-layout form').getByRole('button',{name:/Tuma oda/}).dblclick({delay:40});
 await page.getByRole('heading',{name:'Oda imepokelewa',exact:true}).waitFor();
 const orders=await db.order.findMany({where:{email:firstEmail},include:{items:true}});
 assert.equal(orders.length,1);assert.equal(orders[0].total,2000);assert.equal((await db.product.findUniqueOrThrow({where:{id:productId}})).stock,4);
 pass('double submission creates one COD order and deducts stock once');
 const proof=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('ct-last-checkout-v1')));
 await page.evaluate(()=>{sessionStorage.removeItem('ct-checkout-attempt-v1');sessionStorage.removeItem('ct-last-checkout-v1')});
 await page.goto(base+'/track-order');
 await page.locator('main [name=number]').fill(orders[0].number);await page.locator('main [name=token]').fill(proof.accessToken);
 await page.getByRole('button',{name:'Angalia oda',exact:true}).click();
 await page.locator('.order-receipt h2').waitFor();assert.equal(await page.getByRole('button',{name:'Endelea na malipo',exact:true}).count(),0);
 assert.equal(await page.getByRole('button',{name:'Chapisha / Hifadhi PDF',exact:true}).count(),1);pass('manual COD tracking shows order summary and no online-payment action');
 const onlineProof=randomUUID()+randomUUID(),onlineNumber='AUDIT-'+uid;
 const {id:oldId,createdAt,items,...snapshot}=orders[0];
 await db.order.create({data:{...snapshot,number:onlineNumber,idempotencyKey:randomUUID(),method:'mobile',reservationExpiresAt:new Date(Date.now()+3600000),accessTokenHash:createHash('sha256').update(onlineProof).digest('hex')}});
 await page.locator('main [name=number]').fill(onlineNumber);await page.locator('main [name=token]').fill(onlineProof);
 await page.getByRole('button',{name:'Angalia oda',exact:true}).click();
 await page.getByRole('heading',{name:onlineNumber,exact:true}).waitFor();
 let resumeProof;
 await page.route('**/api/orders/access',async route=>{const body=route.request().postDataJSON();if(body.action==='resume'){resumeProof=body.token;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Malipo hayajawashwa / Payments are disabled'})});}else await route.continue();});
 await page.getByRole('button',{name:'Endelea na malipo',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Malipo hayajawashwa'}).waitFor();assert.equal(resumeProof,onlineProof);pass('manual online tracking reuses its proof and handles gateway errors');
 await page.goto(base+'/account');await page.getByRole('button',{name:'Wasifu',exact:true}).click();
 let releaseExport,markExportStarted,markExportFinished,oldExportDownloads=0;
 const exportGate=new Promise(resolve=>releaseExport=resolve),exportStarted=new Promise(resolve=>markExportStarted=resolve),exportFinished=new Promise(resolve=>markExportFinished=resolve);
 const recordOldExport=()=>oldExportDownloads++;
 page.on('download',recordOldExport);
 await page.route('**/api/account/export?*',async route=>{const response=await route.fetch();markExportStarted();await exportGate;try{await route.fulfill({response});}catch(error){if(!/canceled|closed|disposed|already handled/i.test(error.message))throw error;}finally{markExportFinished();}});
 await page.getByRole('button',{name:'Pakua taarifa zangu (JSON)',exact:true}).click();await exportStarted;
 await page.getByRole('button',{name:'Toka',exact:true}).click();
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('ct-checkout-draft-v1')),null);
 let delayAccount=false;
 await page.route('**/api/account?*',async route=>{if(delayAccount)await new Promise(resolve=>setTimeout(resolve,1500));await route.continue();});
 delayAccount=true;const secondEmail='second-browser-'+uid+'@example.test';await register(secondEmail);await page.getByRole('button',{name:'Oda',exact:true}).click();
 assert.equal(await page.getByText(orders[0].number,{exact:true}).count(),0);
 await page.getByRole('heading',{name:'Bado huna oda',exact:true}).waitFor();assert.equal(await page.getByText(orders[0].number,{exact:true}).count(),0);pass('switching accounts does not expose previous orders during slow loading');
 releaseExport();await exportFinished;await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.equal(oldExportDownloads,0,'A pending export from the previous account must be discarded');page.off('download',recordOldExport);await page.unroute('**/api/account/export?*');pass('pending export is discarded when the signed-in account changes');

 for(const width of [360,390,768,1440]){
  await page.setViewportSize({width,height:900});
  for(const route of ['/','/shop','/account','/quote','/ideas','/chat','/learn','/contact','/privacy','/returns','/track-order']){
   await page.goto(base+route);await page.locator('main h1').first().waitFor();await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${width}px ${route} overflow`);
  }
 }
 pass('44 page and viewport combinations have headings and no horizontal overflow');
 assert.deepEqual(errors,[]);
 await page.goto(base+'/account');
 await page.getByRole('button',{name:'Wasifu',exact:true}).click();
 await page.evaluate(()=>{const create=URL.createObjectURL;URL.createObjectURL=function(blob){window.__auditExportContent=blob.text();return create.call(URL,blob);};});
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Pakua taarifa zangu (JSON)',exact:true}).click();const download=await downloading;
 const generated=await page.evaluate(async()=>JSON.parse(await window.__auditExportContent));
 assert.equal(generated.profile.email,secondEmail);assert.equal(generated.orders.length,0);assert.ok(!JSON.stringify(generated).includes(firstEmail));pass('generated personal-data JSON belongs only to the signed-in account');
 const failure=await download.failure();if(failure)console.log('DOWNLOAD_DIAGNOSTIC',JSON.stringify({failure,filename:download.suggestedFilename()}));assert.equal(failure,null,'native personal-data file download must complete');
 const stream=await download.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString()),generated);pass('native personal-data file download completes with the generated content');
 assert.deepEqual(errors,[]);await context.close();
 console.log(JSON.stringify({auditBrowserChecks:checks,result:'passed'}));
}catch(error){console.log(JSON.stringify({auditBrowserChecks:checks,result:'failed',error:error.message.split('\n')[0]}));throw error;}finally{await browser.close();await db.product.update({where:{id:productId},data:{active:false}});await db.$disconnect();}
