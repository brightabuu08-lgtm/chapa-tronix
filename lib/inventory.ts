import {z} from 'zod';
import {db} from './db';
import {HttpError} from './auth';

export const adjustmentSchema=z.object({productId:z.string().max(80),variantId:z.string().max(80).optional(),delta:z.number().int().min(-100000).max(100000).refine(v=>v!==0),expectedVersion:z.number().int().nonnegative(),reason:z.string().trim().min(5).max(300)});
export async function adjustInventory(body:unknown,actorId:string){
 const input=adjustmentSchema.parse(body);
 return db.$transaction(async tx=>{
  const record=input.variantId?await tx.variant.findUnique({where:{id:input.variantId}}):await tx.product.findUnique({where:{id:input.productId}});
  if(!record||('productId' in record&&record.productId!==input.productId))throw new HttpError(404,'Inventory record not found.');
  if(record.stock+input.delta<0||record.stock+input.delta>100000)throw new HttpError(409,'Stock adjustment is outside the available range.');
  const where={id:record.id,inventoryVersion:input.expectedVersion,stock:record.stock};
  const data={stock:{increment:input.delta},inventoryVersion:{increment:1}};
  const changed=input.variantId?await tx.variant.updateMany({where,data}):await tx.product.updateMany({where,data});
  if(!changed.count)throw new HttpError(409,'Stock imebadilika. Pakia taarifa mpya kabla ya kurekebisha / Stock changed. Refresh before adjusting.');
  await tx.inventoryMovement.create({data:{productId:input.productId,variantId:input.variantId,delta:input.delta,reason:input.reason,actorId}});
  await tx.auditLog.create({data:{userId:actorId,action:'INVENTORY_ADJUST',target:record.id}});
  return {stock:record.stock+input.delta,inventoryVersion:record.inventoryVersion+1};
 },{isolationLevel:'Serializable'});
}
