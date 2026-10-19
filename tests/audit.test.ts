import test from 'node:test';
import assert from 'node:assert/strict';
import {passwordSchema,csvCell} from '../lib/commerce';
import {displayOffer,discountPercent} from '../lib/pricing';
import {createRequire} from 'node:module';
import {checkoutAttempt,saveCheckoutDraft,readCheckoutDraft,clearCheckoutSession,savedCheckout} from '../lib/checkout-attempt';
import {assertTestServerUrl} from './isolated-server.mjs';
import {productSchema} from '../lib/product-schema';
import {assertSellingMode} from '../lib/selling-mode';
import {isStoreRoute} from '../lib/store-routes';
import {products} from '../lib/catalog';

test('password policy prevents bcrypt truncation of multibyte passwords',()=>{
 assert.equal(passwordSchema.safeParse('a'.repeat(72)).success,true);
 assert.equal(passwordSchema.safeParse('é'.repeat(36)).success,true);
 assert.equal(passwordSchema.safeParse('é'.repeat(37)).success,false);
 assert.equal(passwordSchema.safeParse('🔐'.repeat(20)).success,false);
});
test('CSV exports neutralize formulas preceded by whitespace or control characters',()=>{
 for(const input of ['=1+1','\t=1+1','\r\n@SUM(1)',' +1','\uFEFF-2'])assert.ok(csvCell(input).startsWith('"\''));
 assert.equal(csvCell('Chapa tronix'),'"Chapa tronix"');
});
test('a variant starting price keeps its own regular price and discount',()=>{
 const offer=displayOffer({price:1000,oldPrice:2000,stock:0,variants:[{id:'v',name:'Variant',price:750,oldPrice:1000,stock:2}]});
 assert.equal(offer.price,750);assert.equal(offer.oldPrice,1000);assert.equal(discountPercent(offer.price,offer.oldPrice),25);
 const fullPrice=displayOffer({price:1000,oldPrice:2000,stock:0,variants:[{id:'v',name:'Variant',price:750,stock:2}]});
 assert.equal(discountPercent(fullPrice.price,fullPrice.oldPrice),0);
});
test('checkout drafts survive reload without storing passwords and logout clears checkout secrets',()=>{
 const values=new Map<string,string>();
 Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)}});
 try{
  saveCheckoutDraft({name:'Test Customer',street:'A retained delivery address',region:'Mwanza',password:'must-not-persist'});
  assert.equal(readCheckoutDraft()?.street,'A retained delivery address');assert.equal(readCheckoutDraft()?.password,undefined);
  checkoutAttempt({items:[{productId:'fixture',quantity:1}]});clearCheckoutSession();assert.equal(savedCheckout(),null);assert.equal(readCheckoutDraft(),null);
 }finally{delete (globalThis as {sessionStorage?:Storage}).sessionStorage;}
});
test('Prisma config merge dependency handles configuration arrays and recursive input safely',()=>{
 const require=createRequire(import.meta.url),prismaRequire=createRequire(require.resolve('@prisma/config'));
 const {deepmerge}=prismaRequire('deepmerge-ts');
 assert.deepEqual(deepmerge({schema:'schema.prisma',options:{a:1},paths:['a']},{options:{b:2},paths:['b']}),{schema:'schema.prisma',options:{a:1,b:2},paths:['a','b']});
 const cyclic:{self?:unknown}={};cyclic.self=cyclic;
 const result=deepmerge(cyclic,cyclic);assert.equal(result.self,result);
});
test('write-capable browser tests reject business URLs',()=>{
 assert.throws(()=>assertTestServerUrl('http://localhost:5186'));
 assert.throws(()=>assertTestServerUrl('https://shop.example.test'));
 assert.doesNotThrow(()=>assertTestServerUrl('http://localhost:3114'));
});
test('S3 product images accept a configured trailing slash and reject a lookalike host',()=>{
 const previous=process.env.S3_PUBLIC_URL;process.env.S3_PUBLIC_URL='https://images.example.test/store/';
 try{
  assert.equal(productSchema.safeParse({...products[0],images:['https://images.example.test/store/products/test.webp']}).success,true);
  assert.equal(productSchema.safeParse({...products[0],images:['https://images.example.test.evil/store/products/test.webp']}).success,false);
 }finally{if(previous===undefined)delete process.env.S3_PUBLIC_URL;else process.env.S3_PUBLIC_URL=previous;}
});

test('unknown and malformed nested store URLs are rejected before rendering',()=>{
 for(const path of [['shop','unknown'],['product'],['category'],['contact','extra'],['unknown']])assert.equal(isStoreRoute(path),false);
 for(const path of [[],['shop'],['product','a-product'],['category','boards'],['learn','a-guide']])assert.equal(isStoreRoute(path),true);
});
test('live selling requires an approved tax treatment and usable official contacts',()=>{
 const business={pricesApproved:true,deliveryApproved:true,policiesApproved:true,taxMode:'EXEMPT'};
 assert.throws(()=>assertSellingMode(business,'postgresql://localhost/business','live'));
 assert.doesNotThrow(()=>assertSellingMode({...business,email:'support@example.test',phone:'+255712345678'},'postgresql://localhost/business','live'));
});
