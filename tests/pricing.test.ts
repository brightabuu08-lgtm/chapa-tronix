import test from 'node:test';
import assert from 'node:assert/strict';
import {discountedPrice,cartSelection} from '../lib/pricing';
import {products} from '../lib/catalog';
test('discounts round to integer shillings and reject invalid percentages',()=>{assert.equal(discountedPrice(35000,10),31500);assert.equal(discountedPrice(30001,12.5),26251);for(const value of [-1,91,NaN])assert.throws(()=>discountedPrice(1000,value));});
test('cart uses the selected variant price and stock and rejects stale variants',()=>{const product={...products[0],price:35000,stock:2,variants:[{id:'variant-1',name:'With cable',sku:'VAR-1',price:42000,stock:5,active:true}]};const selected=cartSelection(product,'variant-1');assert.equal(selected?.price,42000);assert.equal(selected?.stock,5);assert.equal(cartSelection(product,'removed'),null);});
