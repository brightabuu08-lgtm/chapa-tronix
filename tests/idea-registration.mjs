import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('dist');
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext();
 await context.route('http://chapa.test/**',async route=>{
  let local=path.resolve(root,'.'+new URL(route.request().url()).pathname);
  if(!local.startsWith(root+path.sep))local=path.join(root,'index.html');
  let body;try{body=await readFile(local)}catch{local='index.html';body=await readFile(path.join(root,local))}
  const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
  await route.fulfill({status:200,contentType:types[path.extname(local)]||'application/octet-stream',body});
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://chapa.test/');
 await page.getByRole('link',{name:'Sajili wazo lako Ufadhili: unakuja hivi karibuni'}).click();
 await page.getByRole('heading',{name:'Usajili wa wazo',exact:true}).waitFor();
 assert.ok(page.url().endsWith('/ideas'));
 for(const [key,value] of Object.entries({name:'Asha Juma',email:'asha@example.com',phone:'0712345678',region:'Dar es Salaam',title:'Smart irrigation system',problem:'Farmers need a practical way to monitor soil moisture.',solution:'An ESP32 reads soil moisture sensors and switches an irrigation pump automatically.',support:'Components and technical advice for a prototype.'}))await page.locator(`[name="${key}"]`).fill(value);
 await page.locator('[name="consent"]').check();
 await page.getByRole('button',{name:'Hifadhi rasimu ya wazo',exact:true}).click();
 await page.getByRole('heading',{name:'Rasimu imehifadhiwa kwenye kifaa hiki'}).waitFor();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('ct-idea-draft')));
 assert.equal(saved.status,'LOCAL_DRAFT');assert.equal(saved.phone,'+255712345678');
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Pakua rasimu'}).click();assert.equal((await downloaded).suggestedFilename(),'chapa-tronix-wazo.json');
 await page.setViewportSize({width:360,height:800});await page.goto('http://chapa.test/ideas');await page.getByRole('heading',{name:'Usajili wa wazo',exact:true}).waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.getByRole('button',{name:'Switch language'}).click();await page.getByRole('heading',{name:'Idea registration',exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log('Idea form: navigation, draft, download, mobile and English checks passed.');
}finally{await browser.close()}
