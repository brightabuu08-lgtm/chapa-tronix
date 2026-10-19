import {spawnSync} from 'node:child_process';
for(const args of [[],['--verified']]){const result=spawnSync(process.execPath,['tests/run-access.mjs',...args],{env:process.env,stdio:'inherit',windowsHide:true});if(result.status!==0){process.exitCode=result.status||1;break;}}
