import {readFile} from 'node:fs/promises';import {spawn} from 'node:child_process';
let url=process.env.TEST_DATABASE_URL||process.env.DATABASE_URL;
if(!url||new URL(url).pathname!=='/chapa_tronix_test'){const c=JSON.parse(await readFile('.local-db/credentials.json','utf8'));url=`postgresql://chapa_tronix_test:${c.test}@127.0.0.1:55437/chapa_tronix_test?schema=public`;}
const env={...process.env,DATABASE_URL:url,SELLING_MODE:'test',AUTH_REQUIRE_EMAIL_VERIFICATION:'true',MAIL_PROVIDER:'disabled',PAYMENT_PROVIDER:'disabled',ORDER_ACCESS_SECRET:'TEST_ONLY_ORDER_ACCESS_SECRET_32_CHARACTERS_MINIMUM',NEXT_TELEMETRY_DISABLED:'1'};
const child=spawn(process.execPath,['node_modules/tsx/dist/cli.mjs','tests/review-integration.ts'],{env,stdio:'inherit',windowsHide:true});child.on('error',()=>{console.error('Review tests could not start.');process.exitCode=1});child.on('exit',code=>process.exitCode=code||0);
