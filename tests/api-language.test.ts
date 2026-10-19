import test from 'node:test';
import assert from 'node:assert/strict';
import {errorMessage} from '../lib/api-errors';
const bilingual='Huduma haipatikani kwa sasa / Service temporarily unavailable.';
test('API errors default to English without a Swahili selection',()=>{
 for(const language of [undefined,'en','en-TZ,en;q=0.9','fr','en,sw;q=0.8']){
  const request=new Request('https://example.test',{headers:language?{'accept-language':language}:{}});
  assert.equal(errorMessage(bilingual,request),'Service temporarily unavailable.');
  assert.equal(errorMessage('Product not found.',request),'Product not found.');
 }
});
test('a selected Swahili locale returns the translated error',()=>{
 for(const language of ['sw','sw-TZ','sw,en;q=0.9']){
  const request=new Request('https://example.test',{headers:{'accept-language':language}});
  assert.equal(errorMessage(bilingual,request),'Huduma haipatikani kwa sasa');
  assert.equal(errorMessage('Product not found.',request),'Bidhaa haijapatikana.');
 }
});
