import {assertIsolatedTestServer} from './isolated-server.mjs';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.TEST_BASE_URL||'http://localhost:5186';
await assertIsolatedTestServer(base);
const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
await mkdir('test-results',{recursive:true});
try{for(const width of [360,390,430,768,1440]){
 const context=await browser.newContext({viewport:{width,height:900},isMobile:width<768,hasTouch:width<768});const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base+'/');await page.locator('#main h1').waitFor();await page.locator('.market-product-grid .product-card').first().waitFor();await page.evaluate(()=>document.fonts.ready);
 const cookie=page.getByRole('button',{name:'Nimeelewa',exact:true});if(await cookie.isVisible())await cookie.click();
 assert.equal(await page.locator('.market-benefits').count(),0,'redundant service section is removed from the page');
 const footer=page.locator('.store-footer');await footer.waitFor();
 const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,footer:document.querySelector('.store-footer').getBoundingClientRect().height,firstProduct:document.querySelector('.market-products .product-card').getBoundingClientRect().top,mobileTitle:getComputedStyle(document.querySelector('.hero-mobile-title')).display,desktopTitle:getComputedStyle(document.querySelector('.hero-desktop-title')).display}));
 assert.equal(metrics.overflow,false,`No overflow at ${width}px`);
 if(width<768){assert.ok(metrics.footer<600,`Compact footer at ${width}px, found ${metrics.footer}px`);assert.ok(metrics.firstProduct<760,`Products appear early at ${width}px`);assert.equal(metrics.desktopTitle,'none');assert.notEqual(metrics.mobileTitle,'none');}
 else{assert.equal(metrics.mobileTitle,'none');assert.notEqual(metrics.desktopTitle,'none');}
 assert.equal(await footer.locator('a[href="/admin"]').count(),0,'staff navigation is not shown to guests');
 await page.screenshot({path:`test-results/compact-home-${width}.png`,fullPage:true});await footer.screenshot({path:`test-results/compact-footer-${width}.png`});
 for(const route of ['/shop','/product/arduino-uno-r3','/cart','/account','/contact']){await page.goto(base+route);await page.locator('#main').waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,route+' stays within screen');}
 assert.deepEqual(errors,[],`No runtime errors at ${width}px`);results.push({width,...metrics});await context.close();
}await writeFile('test-results/compact-layout.json',JSON.stringify(results,null,2));console.log(JSON.stringify({result:'passed',results}));}finally{await browser.close();}
