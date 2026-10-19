import {cookies} from 'next/headers';
import {randomBytes,createHash} from 'node:crypto';
import {db} from './db';
import {isAllowedRequestOrigin} from './request-origin';
import type {Role} from '../generated/prisma-v6';
export class HttpError extends Error{constructor(public status:number,message:string){super(message)}}
export const tokenHash=(value:string)=>createHash('sha256').update(value).digest('hex');
export async function currentUser(){const value=(await cookies()).get('ct_session')?.value;if(!value)return null;const session=await db.session.findUnique({where:{id:tokenHash(value)},include:{user:true}});if(!session||session.expiresAt<new Date())return null;const {passwordHash,...safe}=session.user;return safe;}
export function assertVerified(user:{role:Role;emailVerifiedAt?:Date|null}){if(process.env.AUTH_REQUIRE_EMAIL_VERIFICATION==='true'&&user.role==='CUSTOMER'&&!user.emailVerifiedAt)throw new HttpError(403,'Thibitisha barua pepe yako kwanza / Verify your email first.');}
export async function requireUser(roles:Role[]=['CUSTOMER','STAFF','ADMIN'],allowUnverified=false){const user=await currentUser();if(!user)throw new HttpError(401,'Ingia kwanza / Sign in first.');if(!allowUnverified)assertVerified(user);if(!roles.includes(user.role))throw new HttpError(403,'Huna ruhusa / Access denied.');return user;}
export async function startSession(userId:string){const jar=await cookies();const old=jar.get('ct_session')?.value;if(old)await db.session.deleteMany({where:{id:tokenHash(old)}});const token=randomBytes(32).toString('base64url');await db.session.create({data:{id:tokenHash(token),userId,expiresAt:new Date(Date.now()+7*86400000)}});jar.set('ct_session',token,{httpOnly:true,secure:process.env.NODE_ENV==='production'||process.env.APP_URL?.startsWith('https://')===true,sameSite:'lax',path:'/',maxAge:7*86400});}
export async function endSession(){const jar=await cookies();const token=jar.get('ct_session')?.value;if(token)await db.session.deleteMany({where:{id:tokenHash(token)}});jar.delete('ct_session');}
export function assertOrigin(request:Request){if(!isAllowedRequestOrigin(request,process.env))throw new HttpError(403,'Anwani ya website haijaruhusiwa. Hakiki APP_URL / Website origin is not configured. Check APP_URL.');if(!request.headers.get('content-type')?.startsWith('application/json'))throw new HttpError(415,'JSON required.');}
export async function readBody(request:Request){if(Number(request.headers.get('content-length')||0)>262144)throw new HttpError(413,'Request too large.');if(!request.body)throw new HttpError(400,'Invalid JSON.');const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>262144){await reader.cancel();throw new HttpError(413,'Request too large.');}chunks.push(value);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw new HttpError(400,'Invalid JSON.')}}
export async function rateLimit(key:string,limit=10,windowMs=900000){
 const safe=tokenHash(key);
 for(let attempt=0;attempt<4;attempt++){
  try{
   await db.$transaction(async tx=>{
    await tx.rateLimit.deleteMany({where:{key:safe,resetAt:{lt:new Date()}}});
    const row=await tx.rateLimit.upsert({where:{key:safe},update:{count:{increment:1}},create:{key:safe,resetAt:new Date(Date.now()+windowMs)}});
    if(row.count>limit)throw new HttpError(429,'Maombi mengi. Subiri kidogo / Too many requests. Please wait.');
   },{isolationLevel:'Serializable'});
   return;
  }catch(error){
   // Simultaneous requests may race on a new counter or its serializable update.
   const code=error&&typeof error==='object'&&'code' in error?error.code:null;
   if(attempt===3||(code!=='P2002'&&code!=='P2034'))throw error;
  }
 }
}
export const publicUser=(user:{id:string;name:string;email:string;phone:string|null;role:Role;emailVerifiedAt?:Date|null})=>({id:user.id,name:user.name,email:user.email,phone:user.phone,role:user.role,emailVerifiedAt:user.emailVerifiedAt||null});
