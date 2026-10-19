import {z} from 'zod';
import {db} from './db';
import {HttpError} from './auth';
const categorySchema=z.object({id:z.string().regex(/^[a-z0-9-]+$/).max(80),name:z.string().trim().min(2).max(100),nameEn:z.string().trim().min(2).max(100),parentId:z.string().nullable().optional(),active:z.boolean().default(true)});
export async function saveCategory(body:unknown,id:string|undefined,actorId:string){
 const input=categorySchema.parse(body);
 if(id&&id!==input.id)throw new HttpError(400,'Category ID cannot be changed.');
 return db.$transaction(async tx=>{
  let parent=input.parentId;const seen=new Set([input.id]);
  while(parent){
   if(seen.has(parent))throw new HttpError(400,'A category cannot be its own ancestor.');
   seen.add(parent);if(seen.size>6)throw new HttpError(400,'Use no more than five category levels.');
   const record=await tx.category.findFirst({where:{id:parent,active:true}});
   if(!record)throw new HttpError(400,'Choose an active parent category.');parent=record.parentId;
  }
  if(!input.active&&(await tx.product.count({where:{categoryId:input.id,active:true}})||await tx.category.count({where:{parentId:input.id,active:true}})))throw new HttpError(409,'Move or hide the products and child categories first.');
  const result=id?await tx.category.update({where:{id},data:input}):await tx.category.create({data:input});
  await tx.auditLog.create({data:{userId:actorId,action:'CATEGORY_SAVE',target:result.id}});
  return result;
 },{isolationLevel:'Serializable'});
}
