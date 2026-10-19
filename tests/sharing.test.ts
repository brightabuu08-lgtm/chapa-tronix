import test from 'node:test';
import assert from 'node:assert/strict';
import {sharingEnvironment} from '../scripts/start-ngrok-site.mjs';
test('sharing sets one exact public URL and both local development origins',()=>{
 const env=sharingEnvironment('https://shop.ngrok-free.dev/');
 assert.equal(env.APP_URL,'https://shop.ngrok-free.dev');
 assert.equal(env.NEXT_PUBLIC_APP_URL,env.APP_URL);
 assert.equal(env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS,'shop.ngrok-free.dev');
 assert.equal(env.TRUSTED_ORIGINS,'https://shop.ngrok-free.dev,http://localhost:5186,http://127.0.0.1:5186');
});
test('sharing rejects non-HTTPS URLs, paths and embedded credentials',()=>{
 for(const url of ['http://shop.ngrok-free.dev','https://shop.ngrok-free.dev/account','https://user:password@shop.ngrok-free.dev','https://shop.ngrok-free.dev/?token=abc','https://shop.ngrok-free.dev/#x'])assert.throws(()=>sharingEnvironment(url));
});
