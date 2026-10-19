import {db} from '../db';
import {z} from 'zod';
import {HttpError} from '../auth';
import {catalogPage,productBatch} from '../catalog-query';
import {businessSettings} from '../business';
import {json} from './response';
export async function handleCatalog(request:Request,path:string[]){const route=path.join('/'),method=request.method;
if(route==='catalog'&&method==='GET'){const url=new URL(request.url);if(url.searchParams.has('ids'))return json({products:await productBatch(z.array(z.string().max(80)).max(100).parse(url.searchParams.get('ids')!.split(',')))});const data=await catalogPage(url);if(url.searchParams.has('page'))return json(data);const [sales,testimonials]=await Promise.all([db.orderItem.groupBy({by:['productId'],where:{order:{status:{in:['PAID','PACKED','SHIPPED','DELIVERED']}}},_sum:{quantity:true},orderBy:{_sum:{quantity:'desc'}},take:10}),db.review.findMany({where:{approved:true,product:{active:true}},include:{user:{select:{name:true}},product:{select:{name:true}}},orderBy:{createdAt:'desc'},take:3})]);return json({...data,testimonials,bestSellerIds:sales.map(r=>r.productId),business:await businessSettings()});}
if(path[0]==='products'&&method==='GET'){const p=await db.product.findUnique({where:{slug:path[1]},include:{variants:{where:{active:true}},reviews:{where:{approved:true},include:{user:{select:{name:true}}}}}});if(!p?.active)throw new HttpError(404,'Product not found.');const purchased=await db.orderItem.findMany({where:{productId:p.id,order:{status:{in:['PAID','PACKED','SHIPPED','DELIVERED']}}},select:{orderId:true},take:100});const companions=await db.orderItem.groupBy({by:['productId'],where:{productId:{not:p.id},orderId:{in:purchased.map(i=>i.orderId)}},_sum:{quantity:true},orderBy:{_sum:{quantity:'desc'}},take:3});return json({...p,frequentlyBoughtIds:companions.map(i=>i.productId)})}
throw new HttpError(404,'Route not found.');}
