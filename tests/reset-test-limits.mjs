import {readFile} from 'node:fs/promises';
import {PrismaClient} from '../generated/prisma-v6/index.js';
const credentials=JSON.parse(await readFile('.local-db/credentials.json','utf8'));
const url=`postgresql://chapa_tronix_test:${credentials.test}@127.0.0.1:55437/chapa_tronix_test?schema=public`;
if(new URL(url).pathname!=='/chapa_tronix_test')throw new Error('Test database required.');
const db=new PrismaClient({datasourceUrl:url});
try{await db.rateLimit.deleteMany();await db.product.updateMany({where:{id:{startsWith:'qa-stock-'}},data:{active:false}});console.log('Isolated test rate limits reset; old stock fixtures hidden.');}finally{await db.$disconnect();}
