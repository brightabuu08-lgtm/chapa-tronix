import {logEvent} from '../lib/logging';
import {runMaintenance} from '../lib/maintenance';
import {db} from '../lib/db';
const once=process.argv.includes('--once');let stopping=false;
process.on('SIGTERM',()=>{stopping=true;});process.on('SIGINT',()=>{stopping=true;});
do{try{const started=Date.now(),result=await runMaintenance();logEvent('maintenance_success',{durationMs:Date.now()-started,count:result.expired+result.sent});}catch{logEvent('maintenance_failed',{errorType:'maintenance_unavailable'});if(once)process.exitCode=1;}
 if(!once&&!stopping)await new Promise(resolve=>setTimeout(resolve,30000));
}while(!once&&!stopping);
await db.$disconnect();
