import {spawnSync} from 'node:child_process';
import {PrismaClient} from '../generated/prisma-v6/index.js';
const result=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{env:process.env,stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);
const db=new PrismaClient();await db.$executeRaw`REVOKE ALL ON TABLE "_prisma_migrations" FROM chapa_runtime`;await db.$disconnect();console.log('Runtime access to migration metadata revoked.');
