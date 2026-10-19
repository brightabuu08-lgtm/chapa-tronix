import {db} from './db';
import {HttpError} from './auth';
import {productSchema,variantSchema} from './product-schema';
export async function archiveProduct(id:string,actorId:string){
 return db.$transaction(async tx=>{
  const record=await tx.product.update({where:{id},data:{active:false}});
  await tx.auditLog.create({data:{userId:actorId,action:'PRODUCT_ARCHIVE',target:id}});
  return record;
 });
}
export async function saveProduct(body:unknown,id:string|undefined,actorId:string){
 const input=productSchema.parse(body);if(id&&input.id!==id)throw new HttpError(400,'Product ID cannot be changed.');
 return db.$transaction(async tx=>{if(!await tx.category.findFirst({where:{id:input.categoryId,active:true}}))throw new HttpError(400,'Choose an active category.');const {stock,...metadata}=input;
  const record=id?await tx.product.update({where:{id},data:metadata}):await tx.product.create({data:input});
  if(!id&&stock)await tx.inventoryMovement.create({data:{productId:record.id,delta:stock,reason:'Opening stock',actorId}});
  await tx.auditLog.create({data:{userId:actorId,action:'PRODUCT_SAVE',target:record.id}});return record;
 });
}
export async function saveVariant(body:unknown,id:string|undefined,actorId:string){
 const input=variantSchema.parse(body);
 return db.$transaction(async tx=>{if(id){const old=await tx.variant.findUniqueOrThrow({where:{id}});if(old.productId!==input.productId)throw new HttpError(400,'Variant ownership cannot be changed.');}const {stock,...metadata}=input;
  const record=id?await tx.variant.update({where:{id},data:metadata}):await tx.variant.create({data:input});
  if(!id&&stock)await tx.inventoryMovement.create({data:{productId:input.productId,variantId:record.id,delta:stock,reason:'Variant opening stock',actorId}});
  await tx.auditLog.create({data:{userId:actorId,action:'VARIANT_SAVE',target:record.id}});return record;
 });
}
