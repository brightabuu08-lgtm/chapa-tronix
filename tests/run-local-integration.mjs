import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const credentials=JSON.parse(await readFile('.local-db/credentials.json','utf8'));
const env={...process.env,ADMIN_EMAIL:'admin@chapatronix.local',ADMIN_PASSWORD:credentials.admin,DATABASE_URL:`postgresql://chapa_tronix_test:${credentials.test}@127.0.0.1:55437/chapa_tronix_test?schema=public`,TEST_BASE_URL:'http://localhost:3107',MAIL_PROVIDER:'disabled',SELLING_MODE:'test'};
const file=process.argv.includes('--guest-checkout')?'tests/guest-checkout-integration.ts':process.argv.includes('--review')?'tests/review-integration.ts':process.argv.includes('--operations')?'tests/operations.ts':'tests/integration.ts';
const child=spawn(process.execPath,['node_modules/tsx/dist/cli.mjs',file],{env,stdio:'inherit',windowsHide:true});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
