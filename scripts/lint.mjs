import ts from 'typescript';
import {readdir,readFile} from 'node:fs/promises';
const failures=[];let checked=0;
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=dir+'/'+entry.name;if(entry.isDirectory())await walk(file);else if(/\.(ts|tsx|mjs)$/.test(file)){
 const text=await readFile(file,'utf8'),source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:file.endsWith('.mjs')?ts.ScriptKind.JS:ts.ScriptKind.TS);checked++;
 for(const d of source.parseDiagnostics)failures.push(file+': '+ts.flattenDiagnosticMessageText(d.messageText,' '));
 function visit(node){if(ts.isCallExpression(node)||ts.isNewExpression(node)){const name=node.expression.getText(source);if(['eval','Function'].includes(name)||/\.(\$queryRawUnsafe|\$executeRawUnsafe)$/.test(name))failures.push(file+': unsafe dynamic execution '+name);if(file.startsWith('app/api/')&&/request\.(text|arrayBuffer|json)$/.test(name))failures.push(file+': unbounded request body '+name);}ts.forEachChild(node,visit);}visit(source);
 }}}
for(const dir of ['app','components','lib','scripts','tests','preview'])await walk(dir);
for(const failure of failures)console.error(failure);console.log(JSON.stringify({lint:'TypeScript AST syntax/security rules',files:checked,errors:failures.length}));process.exitCode=failures.length?1:0;
