import test from 'node:test';
import assert from 'node:assert/strict';
import {isAllowedRequestOrigin} from '../lib/request-origin';
const req=(origin?:string)=>new Request('http://localhost:5185/api/auth/login',{headers:origin?{origin}:{}});
test('local development accepts the actual server port',()=>{
 assert.ok(isAllowedRequestOrigin(req('http://localhost:5185'),{NODE_ENV:'development'}));
 assert.ok(!isAllowedRequestOrigin(req('http://localhost:3000'),{NODE_ENV:'development'}));
});
test('configured tunnel and local origins work while unrelated origins stay blocked',()=>{
 const env={APP_URL:'https://store.ngrok-free.dev',TRUSTED_ORIGINS:'http://localhost:5185,http://127.0.0.1:5185',NODE_ENV:'development'};
 for(const origin of ['https://store.ngrok-free.dev','http://localhost:5185','http://127.0.0.1:5185'])assert.ok(isAllowedRequestOrigin(req(origin),env));
 for(const origin of ['https://other.ngrok-free.dev','https://store.ngrok-free.dev.evil.test','null','https://evil.test',undefined])assert.ok(!isAllowedRequestOrigin(req(origin),env));
});
test('production does not implicitly allow localhost or forwarded host headers',()=>{
 const request=new Request('http://localhost:5185/api/chat',{headers:{origin:'https://evil.test','x-forwarded-host':'evil.test',host:'evil.test'}});
 assert.ok(!isAllowedRequestOrigin(request,{APP_URL:'https://store.test',NODE_ENV:'production'}));
 assert.ok(!isAllowedRequestOrigin(req('http://localhost:5185'),{APP_URL:'https://store.test',NODE_ENV:'production'}));
 assert.ok(isAllowedRequestOrigin(req('https://store.test'),{APP_URL:'https://store.test',NODE_ENV:'production'}));
});

// A Next server bound to 0.0.0.0 may construct a different internal URL.
test('explicit localhost 3000 origin is allowed for the configured local server without trusting arbitrary hosts',()=>{
 const env={APP_URL:'http://localhost:5186',TRUSTED_ORIGINS:'http://localhost:3000,http://127.0.0.1:3000',NODE_ENV:'production'};
 const request=new Request('http://0.0.0.0:3000/api/admin/inventory',{headers:{origin:'http://localhost:3000'}});
 assert.equal(isAllowedRequestOrigin(request,env),true);
 assert.equal(isAllowedRequestOrigin(new Request(request.url,{headers:{origin:'https://evil.test'}}),env),false);
});
