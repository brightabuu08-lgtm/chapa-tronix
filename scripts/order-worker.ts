import {setTimeout} from 'node:timers/promises';
import {expireReservations} from '../lib/maintenance';
import {db} from '../lib/db';
import {logEvent} from '../lib/logging';
const stopping=new AbortController();
process.on('SIGTERM',()=>stopping.abort());process.on('SIGINT',()=>stopping.abort());
while(!stopping.signal.aborted){
 try{const expired=await expireReservations();await db.workerHeartbeat.upsert({where:{id:'order-reservations'},create:{id:'order-reservations',lastSuccessAt:new Date(),result:{expired}},update:{lastSuccessAt:new Date(),result:{expired}}});}
 catch{logEvent('order_reservation_maintenance_failed',{errorType:'maintenance_unavailable'});}
 try{await setTimeout(30000,undefined,{signal:stopping.signal});}catch{break;}
}
await db.$disconnect();
