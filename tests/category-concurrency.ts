import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {db} from '../lib/db';
import {saveCategory} from '../lib/category-management';
if(new URL(process.env.DATABASE_URL||'').pathname!=='/chapa_tronix_test')throw new Error('Use the isolated test database.');
const id='category-race-'+randomUUID(),a=id+'-a',b=id+'-b';
try{
 const actor=await db.user.findFirstOrThrow({where:{role:'ADMIN'}});
 const data=(key:string,parentId:string|null=null)=>({id:key,name:'Kundi la majaribio',nameEn:'Test category',parentId,active:true});
 await saveCategory(data(a),undefined,actor.id);await saveCategory(data(b),undefined,actor.id);
 const results=await Promise.allSettled([saveCategory(data(a,b),a,actor.id),saveCategory(data(b,a),b,actor.id)]);
 assert.ok(results.some(r=>r.status==='rejected'),'Concurrent reciprocal parents must not both commit.');
 const rows=await db.category.findMany({where:{id:{in:[a,b]}}});
 assert.ok(!(rows.find(r=>r.id===a)?.parentId===b&&rows.find(r=>r.id===b)?.parentId===a),'Saved tree must be acyclic.');
 await assert.rejects(()=>saveCategory(data(a,a),a,actor.id));
 const logs=await db.auditLog.count({where:{action:'CATEGORY_SAVE',target:{in:[a,b]}}});
 assert.equal(logs,results.filter(r=>r.status==='fulfilled').length+2,'Only committed category edits produce audit entries.');
 console.log(JSON.stringify({categoryConcurrencyChecks:3,result:'passed'}));
}finally{await db.$disconnect();}
