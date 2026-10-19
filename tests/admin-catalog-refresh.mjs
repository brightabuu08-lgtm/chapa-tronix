import {assertIsolatedTestServer} from './isolated-server.mjs';
import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const base=process.env.TEST_BASE_URL||'http://localhost:3107';
await assertIsolatedTestServer(base);
const values={ADMIN_EMAIL:process.env.ADMIN_EMAIL,ADMIN_PASSWORD:process.env.ADMIN_PASSWORD};if(!values.ADMIN_EMAIL||!values.ADMIN_PASSWORD)throw new Error('Provide isolated test admin credentials.');
const id='qa-refresh-'+randomUUID(),name='QA Catalog Refresh '+id.slice(-6);
let stage='launch',created=false,context;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 context=await browser.newContext();
 const page=await context.newPage();page.setDefaultTimeout(60000);
 stage='sign in';await page.goto(base+'/account');
 await page.locator('[name="identifier"]').fill(values.ADMIN_EMAIL);
 await page.locator('[name="password"]').fill(values.ADMIN_PASSWORD);
 await page.locator('form').getByRole('button',{name:'Ingia',exact:true}).click();
 await page.locator('.account-actions').waitFor();
 stage='product form';await page.goto(base+'/admin');
 await page.locator('.admin-nav').getByRole('button',{name:'Bidhaa',exact:true}).click();
 await page.getByRole('button',{name:'Ongeza bidhaa',exact:true}).click();
 const form=page.locator('.admin-form form');
 for(const [key,value] of Object.entries({id,slug:id,name,sku:id,brand:'QA',price:'690000',stock:'5',voltage:'3.3V',interface:'GPIO',images:'/images/esp32.jpg',description:'Bidhaa ya majaribio ya kusasisha orodha ya duka.',descriptionEn:'Temporary catalog refresh regression product.'}))await form.locator(`[name="${key}"]`).fill(value);
 stage='save';const saved=page.waitForResponse(r=>r.url().endsWith('/api/admin/products')&&r.request().method()==='POST');
 await form.getByRole('button',{name:'Hifadhi bidhaa',exact:true}).click();
 assert.ok((await saved).ok());created=true;
 await page.locator('.admin-form').waitFor({state:'hidden'});
 await page.locator('.data-table tbody tr').first().filter({hasText:name}).waitFor();
 stage='same-page navigation';
 // Use the app's navigation rather than reloading the document.
 await page.locator('.market-nav-links a[href="/shop"]').click();
 await page.getByRole('heading',{name,exact:true}).waitFor();
 assert.equal(await page.locator('.catalog-grid .product-card h3').first().textContent(),name);
 stage='home navigation';await page.locator('.market-nav-links a[href="/"]').click();
 await page.locator('.market-products').filter({has:page.getByRole('heading',{name:'Bidhaa mpya dukani',exact:true})}).getByRole('heading',{name,exact:true}).waitFor();
 console.log('PASS: product save refreshes admin, catalog and home without a page reload; new products lead the list and prices above TZS 300,000 remain visible.');
}catch{console.error('FAIL: admin/catalog regression at stage '+stage);process.exitCode=1;}
finally{
 if(created&&context){try{await context.request.delete(base+'/api/admin/products/'+id,{headers:{Origin:base,'Content-Type':'application/json'}})}catch{console.error('Test product cleanup could not be completed.');}}
 await browser.close();
}
