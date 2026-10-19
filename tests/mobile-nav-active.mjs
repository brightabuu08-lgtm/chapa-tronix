import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const width of [360,390]){const page=await browser.newPage({viewport:{width,height:850},isMobile:true,hasTouch:true});
 for(const [path,target] of [['/','/shop'],['/shop','/shop'],['/product/arduino-uno-r3','/shop'],['/wishlist','/wishlist'],['/cart','/cart'],['/checkout','/cart'],['/account','/account'],['/reset-password','/account']]){
  await page.goto('http://localhost:5186'+path);await page.locator('.mobile-bottom').waitFor();
  const active=page.locator('.mobile-bottom a[aria-current="page"]');assert.equal(await active.count(),1);assert.equal(await active.getAttribute('href'),target);
  assert.ok(await active.evaluate(e=>getComputedStyle(e).backgroundColor!=='rgba(0, 0, 0, 0)'),'selected item has a background');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 }
 await page.goto('http://localhost:5186/shop');const cookie=page.getByRole('button',{name:'Nimeelewa',exact:true});if(await cookie.isVisible())await cookie.tap();
 for(const target of ['/wishlist','/cart','/account','/shop']){await page.locator('.mobile-bottom a[href="'+target+'"]').tap();await page.waitForFunction(path=>location.pathname===path,target);await page.locator('.mobile-bottom a[href="'+target+'"][aria-current="page"]').waitFor();}
 await page.reload();await page.locator('.mobile-bottom a[href="/shop"][aria-current="page"]').waitFor();await page.close();
}console.log('PASS: active orange bottom navigation on 16 mobile route/viewport combinations, taps and reload.');}finally{await browser.close();}
