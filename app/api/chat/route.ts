import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {requireUser,assertOrigin,readBody,rateLimit,HttpError} from '@/lib/auth';
import {pagination} from '@/lib/catalog-query';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const input=z.object({body:z.string().trim().min(1).max(2000),threadId:z.string().cuid().optional()});
function failure(e:unknown){if(e instanceof HttpError)return json({error:e.message},e.status);if(e instanceof z.ZodError)return json({error:'Hakiki ujumbe na ukurasa uliochagua / Check message and page information.'},400);return json({error:'Chat haipatikani kwa sasa / Chat is temporarily unavailable.'},503);}
export async function GET(request:Request){try{
 const user=await requireUser(),staff=user.role!=='CUSTOMER',url=new URL(request.url),threadId=url.searchParams.get('threadId');
 if(threadId){const thread=await db.adviceThread.findFirst({where:{id:threadId,...(staff?{}:{userId:user.id})}});if(!thread)throw new HttpError(404,'Conversation not found.');const before=url.searchParams.get('before');if(before&&!await db.adviceMessage.findFirst({where:{id:before,threadId}}))throw new HttpError(400,'Invalid message cursor.');const rows=await db.adviceMessage.findMany({where:{threadId},orderBy:[{createdAt:'desc'},{id:'desc'}],take:51,...(before?{cursor:{id:before},skip:1}:{})});const messages=rows.slice(0,50).reverse();return json({threadId,messages,hasMore:rows.length>50,before:messages[0]?.id});}
 const {page,pageSize}=pagination(url),where=staff?{}:{userId:user.id};
 const [threads,total]=await Promise.all([db.adviceThread.findMany({where,orderBy:[{updatedAt:'desc'},{id:'asc'}],skip:(page-1)*pageSize,take:pageSize,include:{...(staff?{user:{select:{name:true,email:true}}}:{}),_count:{select:{messages:true}},messages:{orderBy:[{createdAt:'desc'},{id:'desc'}],take:50}}}),db.adviceThread.count({where})]);
 return json({page,hasMore:page*pageSize<total,threads:threads.map(v=>({...v,messagesMore:v._count.messages>v.messages.length,messages:v.messages.reverse()}))});
}catch(e){return failure(e);}}
export async function POST(request:Request){try{assertOrigin(request);const user=await requireUser();const data=input.parse(await readBody(request));await rateLimit('chat:'+user.id,30,60000);const staff=user.role!=='CUSTOMER';const result=await db.$transaction(async tx=>{const thread=staff?await tx.adviceThread.findUnique({where:{id:data.threadId||''}}):await tx.adviceThread.upsert({where:{userId:user.id},create:{userId:user.id},update:{}});if(!thread)throw new HttpError(404,'Mazungumzo hayapo / Conversation not found.');const message=await tx.adviceMessage.create({data:{threadId:thread.id,body:data.body,fromStaff:staff,senderId:user.id}});await tx.adviceThread.update({where:{id:thread.id},data:{updatedAt:new Date()}});if(staff)await tx.auditLog.create({data:{userId:user.id,action:'CHAT_REPLY',target:thread.id}});return message;});return json({message:result},201);}catch(e){return failure(e);}}
