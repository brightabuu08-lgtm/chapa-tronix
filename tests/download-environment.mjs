// Synthetic download probe: no application, credentials, or database.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:process.env.CI?undefined:'chrome',headless:true,args:['--disable-background-networking']});
try{
 const context=await browser.newContext({acceptDownloads:true}),page=await context.newPage();
 await page.setContent('<button type="button">Download synthetic JSON</button>');
 await page.evaluate(()=>{document.querySelector('button').onclick=()=>{const anchor=document.createElement('a');anchor.href=URL.createObjectURL(new Blob(['{"synthetic":true}'],{type:'application/json'}));anchor.download='audit-synthetic.json';document.body.append(anchor);anchor.click();};});
 const event=page.waitForEvent('download');await page.click('button');const download=await event,failure=await download.failure();
 console.log(JSON.stringify({probe:'synthetic Chrome file download; no application involved',failure,result:failure?'failed':'passed'}));
 assert.equal(failure,null,'Native download must complete independently of the application.');
}finally{await browser.close()}
