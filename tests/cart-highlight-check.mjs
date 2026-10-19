import {chromium} from '@playwright/test';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('dist');
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext();
await context.route('http://chapa.test/**',async route=>{
 const url=new URL(route.request().url());
 let local=path.resolve(root,'.'+url.pathname);
 if(!local.startsWith(root+path.sep))local=path.join(root,'index.html');
 let buffer;try{buffer=await readFile(local)}catch{buffer=await readFile(path.join(root,'index.html'));local='index.html'}
 const ext=path.extname(local);
 const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
 await route.fulfill({status:200,contentType:types[ext]||'application/octet-stream',body:buffer});
});

const page=await context.newPage();
try{
 await page.goto('http://chapa.test/shop');
 await page.getByRole('button',{name:'Nimeelewa',exact:true}).click();
 await page.getByRole('button',{name:'Ongeza Arduino Uno R3',exact:true}).click();
 await page.getByRole('button',{name:'Ongeza ESP32-DevKitC',exact:true}).click();
 await page.locator('h1').click();
 assert.equal(await page.locator('.add-button.in-cart').count(),2);
 const color=await page.locator('.add-button.in-cart').first().evaluate(e=>getComputedStyle(e).backgroundColor);
 assert.equal(color,'rgb(249, 103, 52)');
 await page.reload();
 assert.equal(await page.locator('.add-button.in-cart').count(),2);
 await page.goto('http://chapa.test/cart');
 await page.locator('.cart-item').filter({has:page.getByRole('heading',{name:'Arduino Uno R3',exact:true})}).getByRole('button',{name:'Ondoa',exact:true}).click();
 await page.goto('http://chapa.test/shop');
 assert.equal(await page.locator('.add-button.in-cart').count(),1);
 assert.equal(await page.getByRole('button',{name:'Ongeza Arduino Uno R3',exact:true}).getAttribute('class'),'add-button');
 console.log('Cart highlight: two products stay orange after focus moves and reload; removing one resets only its button.');
}finally{await browser.close();}
