import {processEmails} from '../lib/mail';
import {db} from '../lib/db';
let stopping=false;
process.on('SIGTERM',()=>{stopping=true;});process.on('SIGINT',()=>{stopping=true;});
console.log('Email worker started; checking the outbox every 30 seconds.');
try{
 do{
  try{const result=await processEmails();await db.workerHeartbeat.upsert({where:{id:'mail'},create:{id:'mail',lastSuccessAt:new Date(),result},update:{lastSuccessAt:new Date(),result}});if(result.sent)console.log(`Email worker: ${result.sent} email(s) accepted by provider.`);}catch{console.error('Email worker: delivery check failed; retrying.');}
  if(!stopping)await new Promise<void>(resolve=>{const stop=()=>{clearTimeout(timer);process.off('SIGTERM',stop);process.off('SIGINT',stop);resolve();};const timer=setTimeout(stop,30000);process.once('SIGTERM',stop);process.once('SIGINT',stop);});
 }while(!stopping);
}finally{await db.$disconnect();}
