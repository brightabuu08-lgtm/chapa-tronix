import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {validSignature,paymentsEnabled,initiatePayment} from '../lib/payments';
test('cash-only and unimplemented Azam provider cannot initiate an online charge even with stale keys',async()=>{
 const saved={PAYMENT_PROVIDER:process.env.PAYMENT_PROVIDER,FLUTTERWAVE_SECRET_KEY:process.env.FLUTTERWAVE_SECRET_KEY,FLUTTERWAVE_WEBHOOK_SECRET:process.env.FLUTTERWAVE_WEBHOOK_SECRET};
 const originalFetch=globalThis.fetch;
 try{
  process.env.FLUTTERWAVE_SECRET_KEY='mock-stale-key';process.env.FLUTTERWAVE_WEBHOOK_SECRET='mock-stale-secret';
  globalThis.fetch=async()=>{assert.fail('Cash-only checkout must never contact a gateway');};
  for(const provider of ['disabled','azampesa','azampay']){
   process.env.PAYMENT_PROVIDER=provider;assert.equal(paymentsEnabled(),false);
   await assert.rejects(initiatePayment({id:'test-only',number:'CT-TEST',total:1000,email:'test@example.test',name:'Fixture',phone:'0712345678',method:'mobile'}),/not configured/);
  }
 }finally{globalThis.fetch=originalFetch;for(const [key,value] of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
test('webhook rejects tampering, missing and wrong signatures',()=>{const raw='{"event":"charge.completed"}',secret='test-only-secret',signature=createHmac('sha256',secret).update(raw).digest('base64');assert.equal(validSignature(raw,signature,secret),true);assert.equal(validSignature(raw+' ',signature,secret),false);assert.equal(validSignature(raw,null,secret),false);assert.equal(validSignature(raw,'wrong',secret),false)});

 test('cash-only mode disables configured gateways',()=>{
  const keys=['CASH_ONLY','PAYMENT_PROVIDER','FLUTTERWAVE_SECRET_KEY','FLUTTERWAVE_WEBHOOK_SECRET'];const saved=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  try{process.env.PAYMENT_PROVIDER='flutterwave';process.env.FLUTTERWAVE_SECRET_KEY='mock-only';process.env.FLUTTERWAVE_WEBHOOK_SECRET='mock-only';process.env.CASH_ONLY='true';assert.equal(paymentsEnabled(),false);process.env.CASH_ONLY='false';assert.equal(paymentsEnabled(),true);}
  finally{for(const key of keys){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}}
 });
