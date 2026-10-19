import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {assertIsolatedTestServer} from './isolated-server.mjs';
const base=process.env.TEST_BASE_URL||'http://localhost:3107';
await assertIsolatedTestServer(base);
let checks=0;const pass=(label:string)=>{checks++;console.log('PASS '+label);};
async function post(path:string,body:unknown){return fetch(base+'/api/'+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(body)});}
for(const path of ['/','/shop','/checkout','/cart','/wishlist','/learn','/ideas','/quote','/chat','/track-order']){
 const response=await fetch(base+path,{redirect:'manual'}),html=await response.text();assert.equal(response.status,200);assert.equal(response.headers.has('location'),false);assert.equal(html.includes('NEXT_REDIRECT'),false);pass('guest stays on '+path);
}
for(const path of ['account','account/export','admin/products','chat']){assert.equal((await fetch(base+'/api/'+path)).status,401);pass('private '+path+' remains protected');}
assert.equal((await post('checkout',{})).status,401);pass('an account is required when actually placing an order');
const id=randomUUID(),contact={name:'Isolated guest fixture',email:'guest-'+id+'@example.test',phone:'0712345678'};
assert.equal((await post('quotes',{...contact,organization:'Guest support fixture',details:'Isolated guest question about compatible ESP32 components.'})).status,201);pass('guest can submit a quote or support question without an account');
assert.equal((await post('ideas',{...contact,region:'Dar es Salaam',title:'Isolated guest project',stage:'idea',problem:'Students need a safe way to explore automation.',solution:'Build a low-voltage sensor and indicator demonstration for learning.',support:'Help selecting compatible sensors.',consent:true})).status,201);pass('guest can register a project idea without an account');
assert.equal((await post('coupons/validate',{code:'NONEXISTENT-'+id,subtotal:1000})).status,400);pass('guest coupon check validates the coupon without requesting sign-in');
assert.equal((await post('orders/access',{number:'NONEXISTENT-'+id,token:'invalid-proof'})).status,404);pass('guest tracking requires a valid order proof without requesting sign-in');
console.log(JSON.stringify({guestJourneyChecks:checks,result:'passed',realEmails:0,realOrders:0}));
