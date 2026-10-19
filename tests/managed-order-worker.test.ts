import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {orderWorkerEnvironment,manageOrderWorker} from '../scripts/managed-order-worker.mjs';
test('reservation maintenance only starts for live sales and excludes unrelated credentials',()=>{
 const source={SELLING_MODE:'live',DATABASE_URL:'postgresql://fixture',ADMIN_PASSWORD:'exclude',BREVO_API_KEY:'exclude'};
 assert.equal(orderWorkerEnvironment({...source,SELLING_MODE:'closed'}),null);assert.equal(orderWorkerEnvironment({...source,SELLING_MODE:'test'}),null);
 assert.deepEqual(orderWorkerEnvironment(source),{DATABASE_URL:source.DATABASE_URL});
});
test('reservation worker starts once when ready and stops with the website',()=>{
 const server:any=new EventEmitter();server.stdout=new EventEmitter();const worker:any=new EventEmitter();let launches=0,stops=0;worker.kill=()=>{stops++;};
 const stop=manageOrderWorker(server,{root:process.cwd(),env:{SELLING_MODE:'live',DATABASE_URL:'postgresql://fixture'}},(()=>{launches++;return worker;}) as any)!;
 server.stdout.emit('data','Starting');assert.equal(launches,0);server.stdout.emit('data','Ready in 100ms');server.stdout.emit('data','Ready in 200ms');assert.equal(launches,1);server.emit('exit',0);stop();assert.equal(stops,1);
});
