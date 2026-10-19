import test from 'node:test';
import assert from 'node:assert/strict';
import {localEnvironment} from '../scripts/local-environment.mjs';
import {isAllowedRequestOrigin} from '../lib/request-origin';
test('local launcher preserves the configured Cloudflare domain and trusts its forms',()=>{
 const env=localEnvironment({publicUrl:'https://chapatronix.store/'});
 assert.equal(env.APP_URL,'https://chapatronix.store');
 assert.equal(env.NEXT_PUBLIC_APP_URL,env.APP_URL);
 assert.ok(isAllowedRequestOrigin(new Request('http://localhost:5186/api/auth/login',{headers:{origin:env.APP_URL}}),env));
 assert.ok(!isAllowedRequestOrigin(new Request('http://localhost:5186/api/auth/login',{headers:{origin:'https://untrusted.example'}}),env));
 assert.ok(env.TRUSTED_ORIGINS.includes('http://127.0.0.1:5186'));
});
test('isolated tests never inherit the public URL',()=>{
 const env=localEnvironment({port:3107,testMode:true,publicUrl:'https://chapatronix.store'});
 assert.equal(env.APP_URL,'http://localhost:3107');
 assert.equal(env.TRUSTED_ORIGINS,'http://localhost:3107,http://127.0.0.1:3107');
});
test('local-only mode still works and invalid public destinations are rejected',()=>{
 assert.equal(localEnvironment().APP_URL,'http://localhost:5186');
 for(const publicUrl of ['http://chapatronix.store','https://chapatronix.store/account','https://user:password@chapatronix.store'])assert.throws(()=>localEnvironment({publicUrl}));
});
