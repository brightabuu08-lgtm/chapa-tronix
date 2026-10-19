import {ZodError} from 'zod';
import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {HttpError,rateLimit,requireUser} from '@/lib/auth';
import {errorMessage} from '@/lib/api-errors';
import {pagination} from '@/lib/catalog-query';
import {logEvent} from '@/lib/logging';

export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{
  const user=await requireUser();await rateLimit('account-export:'+user.id,60,60000);
  const {page}=pagination(new URL(request.url)),take=100,skip=(page-1)*take;
  const [profile,addresses,orders,reviews,wishlist,messages,counts]=await db.$transaction([
   db.user.findUnique({where:{id:user.id},select:{id:true,name:true,email:true,phone:true,createdAt:true,emailVerifiedAt:true}}),
   db.address.findMany({where:{userId:user.id},skip,take,orderBy:{id:'asc'}}),
   db.order.findMany({where:{userId:user.id},skip,take,orderBy:[{createdAt:'asc'},{id:'asc'}],select:{number:true,status:true,createdAt:true,name:true,email:true,phone:true,region:true,street:true,delivery:true,method:true,subtotal:true,shipping:true,discount:true,total:true,taxAmount:true,taxMode:true,taxLabel:true,tracking:true,items:{select:{name:true,quantity:true,unitPrice:true}}}}),
   db.review.findMany({where:{userId:user.id},skip,take,orderBy:{id:'asc'},select:{productId:true,rating:true,text:true,approved:true,createdAt:true}}),
   db.wishlist.findMany({where:{userId:user.id},skip,take,orderBy:{productId:'asc'},select:{productId:true}}),
   db.adviceMessage.findMany({where:{thread:{userId:user.id}},skip,take,orderBy:[{createdAt:'asc'},{id:'asc'}],select:{body:true,fromStaff:true,createdAt:true}}),
   db.user.findUniqueOrThrow({where:{id:user.id},select:{_count:{select:{addresses:true,orders:true,reviews:true,wishlist:true}}}})
  ]);
  const messageCount=await db.adviceMessage.count({where:{thread:{userId:user.id}}});
  const hasMore=Math.max(...Object.values(counts._count),messageCount)>page*take;
  if(page===1)await db.auditLog.create({data:{userId:user.id,action:'PERSONAL_DATA_EXPORT',target:user.id}});
  return NextResponse.json({profile,addresses,orders,reviews,wishlist,messages,page,pageSize:take,hasMore},{headers:{'Cache-Control':'private, no-store','Content-Disposition':'attachment; filename="chapa-tronix-personal-data.json"','X-Content-Type-Options':'nosniff'}});
 }catch(error){
  if(error instanceof ZodError)return NextResponse.json({error:'Chagua ukurasa halali / Choose a valid page.'},{status:400,headers:{'Cache-Control':'no-store'}});
  if(error instanceof HttpError)return NextResponse.json({error:errorMessage(error.message,request)},{status:error.status,headers:{'Cache-Control':'no-store'}});
  logEvent('personal_data_export_failed',{errorType:error instanceof Error?error.name:'Unknown'});
  return NextResponse.json({error:'Taarifa hazijapakuliwa. Jaribu tena / Export unavailable. Please retry.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
