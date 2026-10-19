import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('test-results/reference',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
try {
 await page.goto('https://myshop.co.tz/',{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForTimeout(8000);
 await page.screenshot({path:'test-results/reference/myshop-desktop.png',fullPage:true});
 const text=await page.locator('body').innerText();
 await writeFile('test-results/reference/myshop-text.txt',text);
 await writeFile('test-results/reference/myshop.html',await page.content());
 console.log(JSON.stringify({url:page.url(),text:text.slice(0,16000),styles:await page.locator('body').evaluate(el=>({background:getComputedStyle(el).backgroundColor,font:getComputedStyle(el).fontFamily})),links:await page.locator('a').evaluateAll(nodes=>nodes.slice(0,45).map(n=>({text:n.innerText,url:n.href})))}));
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'test-results/reference/myshop-mobile.png',fullPage:true});
} finally {await browser.close();}
