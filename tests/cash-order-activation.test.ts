import test from 'node:test';
import assert from 'node:assert/strict';
import {assertSellingMode} from '../lib/selling-mode';
const unfinished={codEnabled:true,pricesApproved:false,deliveryApproved:false,policiesApproved:false,taxMode:'UNCONFIGURED'};
test('explicit cash activation accepts pending cash orders without inventing tax or policy approval',()=>{
 const saved={CASH_ONLY:process.env.CASH_ONLY,CASH_ORDERS_OPEN:process.env.CASH_ORDERS_OPEN};
 try{
  process.env.CASH_ONLY='true';process.env.CASH_ORDERS_OPEN='true';
  assert.doesNotThrow(()=>assertSellingMode(unfinished,'postgresql://localhost/business','live'));assert.equal(unfinished.taxMode,'UNCONFIGURED');assert.equal(unfinished.policiesApproved,false);
  assert.throws(()=>assertSellingMode({...unfinished,codEnabled:false},'postgresql://localhost/business','live'));
  assert.throws(()=>assertSellingMode(unfinished,'postgresql://localhost/business','closed'));
  process.env.CASH_ONLY='false';assert.throws(()=>assertSellingMode(unfinished,'postgresql://localhost/business','live'));
  process.env.CASH_ONLY='true';process.env.CASH_ORDERS_OPEN='false';assert.throws(()=>assertSellingMode(unfinished,'postgresql://localhost/business','live'));
 }finally{for(const [key,value] of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
