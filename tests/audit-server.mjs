// Test-only Next server with an owned IPC lifecycle; never a deployment entrypoint.
import next from 'next';
import {createServer} from 'node:http';
const database=new URL(process.env.DATABASE_URL||'http://not-configured'),port=Number(process.env.AUDIT_SERVER_PORT);
if(database.pathname!=='/chapa_tronix_test'||process.env.SELLING_MODE!=='test'||!process.send||port<3110||port>3130)throw new Error('Launch only through the isolated audit runner.');
const app=next({dev:true,webpack:true,dir:process.cwd(),hostname:'127.0.0.1',port});
await app.prepare();
const server=createServer(app.getRequestHandler());
server.on('upgrade',app.getUpgradeHandler());
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)});
console.log('Isolated Next audit server ready on '+port);
let stopping=false;
async function stop(){if(stopping)return;stopping=true;server.closeAllConnections();server.close();await app.close();process.exit(0);}
process.on('message',message=>{if(message?.type==='audit-stop')stop().catch(()=>process.exit(1));});
process.on('disconnect',()=>stop().catch(()=>process.exit(1)));
