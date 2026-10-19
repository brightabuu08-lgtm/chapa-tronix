import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('dist');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({viewport:{width:360,height:800},isMobile:true,hasTouch:true});
 await context.route('https://shop.ngrok-free.dev/**',async route=>{
  let local=path.resolve(root,'.'+new URL(route.request().url()).pathname);
  if(!local.startsWith(root+path.sep))local=path.join(root,'index.html');
  let body;try{body=await readFile(local)}catch{local='index.html';body=await readFile(path.join(root,local));}
  const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
  await route.fulfill({body,contentType:types[path.extname(local)]||'application/octet-stream'});
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://shop.ngrok-free.dev/');
 await page.getByRole('button',{name:'Nimeelewa',exact:true}).tap();
 const toggle=page.locator('.sidebar-toggle > summary');
 await toggle.tap();assert.equal(await page.locator('.sidebar-toggle[open]').count(),1);
 assert.ok(await page.evaluate(()=>!!document.elementFromPoint(innerWidth-2,innerHeight-2)?.closest('.market-drawer')),'sidebar covers the bottom navigation');
 await page.locator('.drawer-panel a[href="/shop"]').tap();
 assert.equal(new URL(page.url()).pathname,'/shop');
 assert.equal(await page.locator('.sidebar-toggle[open]').count(),0);
 await toggle.tap();await toggle.tap();
 assert.equal(await page.locator('.sidebar-toggle[open]').count(),0);
 await page.locator('.market-category-menu summary').tap();
 await page.locator('.category-dropdown a[href="/category/boards"]').tap();
 assert.equal(new URL(page.url()).pathname,'/category/boards');
 await page.getByRole('button',{name:'Switch language'}).tap();
 assert.equal(await page.locator('html').getAttribute('lang'),'en');
 const touch=await context.newCDPSession(page);
 async function swipe(x1,y1,x2,y2){
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x1,y:y1,id:1}]});
  for(let step=1;step<=8;step++)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x1+(x2-x1)*step/8,y:y1+(y2-y1)*step/8,id:1}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }
 await swipe(8,180,150,185);
 assert.equal(await page.locator('.sidebar-toggle[open]').count(),1,'right swipe from edge opens');
 await swipe(240,170,90,175);
 assert.equal(await page.locator('.sidebar-toggle[open]').count(),0,'left swipe closes');
 await toggle.tap();await page.touchscreen.tap(350,400);
 assert.equal(await page.locator('.sidebar-toggle[open]').count(),0,'tap outside closes');
 await toggle.tap();await swipe(220,320,224,200);
 assert.equal(await page.locator('.sidebar-toggle[open]').count(),1,'vertical swipe does not close');
 await toggle.tap();
 // Simulate JavaScript being unavailable after initial HTML is rendered.
 const cdp=await context.newCDPSession(page);
 await cdp.send('Emulation.setScriptExecutionDisabled',{value:true});
 await toggle.tap();assert.equal(await page.locator('.sidebar-toggle[open]').count(),1);
 await toggle.tap();assert.equal(await page.locator('.sidebar-toggle[open]').count(),0);
 await cdp.send('Emulation.setScriptExecutionDisabled',{value:false});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.deepEqual(errors,[]);
 console.log('Mobile touch: sidebar, outside dismissal, swipe opening/closing, vertical scrolling, navigation, categories, language and native toggle with scripts disabled passed. HTTPS assets were intercepted locally; no public tunnel was contacted.');
}finally{await browser.close();}
