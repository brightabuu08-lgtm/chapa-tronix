import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import path from 'node:path';
const url=new URL(process.env.DATABASE_URL||'');if(!['postgres:','postgresql:'].includes(url.protocol))throw new Error('Configure DATABASE_URL.');
const directory=path.resolve(process.env.BACKUP_DIR||'.local-db/backups');await mkdir(directory,{recursive:true});
const file=path.join(directory,'chapa-'+new Date().toISOString().replace(/[:.]/g,'-')+'.dump');
const executable=process.env.PG_BIN?path.join(process.env.PG_BIN,process.platform==='win32'?'pg_dump.exe':'pg_dump'):process.platform==='win32'?'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe':'pg_dump';
const child=spawn(executable,['--host',url.hostname,'--port',url.port||'5432','--username',decodeURIComponent(url.username),'--dbname',url.pathname.slice(1),'--format=custom','--no-owner','--no-acl','--file',file],{env:{...process.env,PGPASSWORD:decodeURIComponent(url.password)},windowsHide:true,stdio:'inherit'});
child.on('error',()=>{console.error('Backup could not start. Configure PG_BIN.');process.exitCode=1;});child.on('exit',code=>{if(code===0)console.log('Database backup saved:',file);else process.exitCode=code||1;});
