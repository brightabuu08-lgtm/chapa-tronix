import assert from 'node:assert/strict';
import {chromium,expect as baseExpect} from '@playwright/test';
const expect=baseExpect.configure({timeout:45000}),base=process.env.TEST_BASE_URL;
if(!base?.endsWith(':3126'))throw new Error('Owned test server required.');
const browser=await chromium.launch({channel:process.env.CI?undefined:'chrome',headless:true});
try{
 const context=await browser.newContext();await context.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(kind==='webgl2')return null;return original.call(this,kind,...args);};});
 const page=await context.newPage();page.setDefaultNavigationTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/learn');
 await expect(page.locator('.robot-studio.fallback img')).toBeVisible();await expect.poll(()=>page.locator('.robot-studio.fallback img').evaluate(image=>image.naturalWidth)).toBeGreaterThan(0);await expect(page.getByRole('heading',{name:/Jifunze kwa vitendo|Learn by building/})).toBeVisible();assert.deepEqual(errors,[]);await context.close();
 const capable=await browser.newContext(),scene=await capable.newPage();scene.setDefaultNavigationTimeout(120000);await scene.goto(base+'/learn');await expect(scene.locator('.robot-studio.ready canvas')).toBeVisible();
 const loss=await scene.locator('canvas').evaluate(canvas=>{const extension=canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context');if(!extension)return false;extension.loseContext();return true;});assert.equal(loss,true,'Browser must support the real context-loss exercise');await expect(scene.locator('.robot-studio.fallback img')).toBeVisible();await expect(scene.getByRole('heading',{name:/Jifunze kwa vitendo|Learn by building/})).toBeVisible();await capable.close();
 console.log(JSON.stringify({robotFallbackChecks:2,result:'passed',scenarios:['WebGL unavailable','actual WebGL context loss'],businessWrites:0}));
}finally{await browser.close();}
