import {readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const schema=await readFile('prisma/schema.prisma','utf8');
const output=schema.match(/output\s*=\s*"\.\.\/([^"\n]+)"/)[1];
const digest=createHash('sha256').update(schema).digest('hex');
let cached=false;
try{await access(output+'/index.js');cached=(await readFile(output+'/.schema.sha256','utf8'))===digest;}catch{}
if(!cached){const result=spawnSync(process.execPath,['node_modules/prisma/build/index.js','generate'],{stdio:'inherit',windowsHide:true});if(result.status!==0)process.exit(result.status||1);await writeFile(output+'/.schema.sha256',digest);}
else console.log('Prisma client matches the schema.');
