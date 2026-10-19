import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';

const base=process.env.TEST_BASE_URL||'http://localhost:5186';
const url=new URL(base);
assert.ok(['localhost','127.0.0.1'].includes(url.hostname)&&['5186','3107','3110'].includes(url.port),'Use a local store server.');
const browser=await chromium.launch({channel:process.env.CI?undefined:'chrome',headless:true,args:['--disable-background-networking']});
let checks=0;
try{
 for(const mobile of [false,true])for(const language of ['sw','en']){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900}});
  await context.addInitScript(language=>localStorage.setItem('ct-lang',language),language);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&/hydrat|server rendered|didn't match/i.test(message.text()))errors.push(message.text());});
  const response=await page.goto(base,{waitUntil:'networkidle'});
  assert.equal(response.status(),200);
  const markup=await response.text();
  assert.match(markup,/href="\/track-order"/);
  assert.match(markup,/href="\/contact"/);
  assert.equal(await page.locator('html').getAttribute('lang'),language);
  const footer=page.locator('.store-footer-links a');
  assert.deepEqual(await footer.evaluateAll(links=>links.map(link=>link.getAttribute('href'))),['/shop','/shop?sort=new','/quote','/learn','/track-order','/contact','/shipping','/returns','/faq']);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('.store-footer-links a[href="/track-order"]').click();
  await page.waitForURL('**/track-order');
  await page.reload({waitUntil:'networkidle'});
  assert.deepEqual(errors,[],`${mobile?'mobile':'desktop'} / ${language}`);
  checks++;
  await context.close();
 }
 console.log(JSON.stringify({hydrationScenarios:checks,result:'passed',scope:'Read-only home and order-tracking visits; fresh load, reload, saved language, desktop/mobile. No checkout or business-data mutations.'}));
}finally{await browser.close();}
