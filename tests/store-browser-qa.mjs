import {assertIsolatedTestServer} from './isolated-server.mjs';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.TEST_BASE_URL||'http://localhost:3107';
await assertIsolatedTestServer(base);
const browser=await chromium.launch({channel:'chrome',headless:true});const report=[];await mkdir('test-results',{recursive:true});
try{for(const width of [360,390,768,1440]){
 const context=await browser.newContext({viewport:{width,height:900},isMobile:width<768,hasTouch:width<768});const page=await context.newPage();page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/');await page.getByRole('button',{name:'Nimeelewa',exact:true}).click();
 await page.locator('.market-products .product-card').first().waitFor();
 if(width<768){await page.locator('.sidebar-toggle>summary').tap();assert.equal(await page.locator('.sidebar-toggle[open]').count(),1);await page.mouse.click(width-4,700);assert.equal(await page.locator('.sidebar-toggle[open]').count(),0);}
 for(const route of ['/','/shop','/product/arduino-uno-r3','/cart','/account','/quote','/contact','/learn','/reset-password','/privacy']){
  await page.goto(base+route);await page.locator('#main').waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(300);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,`${width}px ${route} must not overflow`);
  assert.ok(await page.locator('main h1').count(),`${route} has a main heading`);
  report.push({width,route,overflow:false});
  if(route==='/')await page.screenshot({path:`test-results/home-${width}.png`,fullPage:true});
 }
 await page.goto(base+'/shop');const cards=page.locator('.product-card');const valid=[];for(let i=0;i<await cards.count();i++){if(await cards.nth(i).locator('.add-button').isEnabled())valid.push(i);if(valid.length===2)break;}
 if(valid.length===2){await cards.nth(valid[0]).locator('.add-button').click();if(new URL(page.url()).pathname==='/shop'){await cards.nth(valid[1]).locator('.add-button').click();assert.equal(await page.locator('.add-button.in-cart').count(),2);await cards.nth(valid[0]).locator('.add-button').click();assert.equal(await page.locator('.add-button.in-cart').count(),1);await page.reload();await page.locator('.add-button.in-cart').first().waitFor();assert.equal(await page.locator('.add-button.in-cart').count(),1);}}
 await page.locator('.language').click();await page.waitForFunction(()=>document.documentElement.lang==='en');
 assert.deepEqual(errors,[],`No runtime errors at ${width}px`);await context.close();
}
 await writeFile('test-results/browser-qa.json',JSON.stringify(report,null,2));console.log('PASS browser QA: 40 route/viewport combinations; mobile sidebar, two-product cart toggles, cart persistence and language switch.');
}finally{await browser.close();}
