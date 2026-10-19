import {errorMessage} from '@/lib/api-errors';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {assertOrigin,readBody,rateLimit,requireUser,HttpError} from '@/lib/auth';
import {accountToken,useAccountToken} from '@/lib/account-tokens';
import {passwordSchema} from '@/lib/commerce';
export const dynamic='force-dynamic';
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('request-reset'),email:z.email().transform(v=>v.toLowerCase())}),z.object({action:z.literal('reset'),token:z.string().min(20).max(100),password:passwordSchema}),
 z.object({action:z.literal('request-verify')}),z.object({action:z.literal('verify'),token:z.string().min(20).max(100)})
]);
export async function POST(request:Request){try{
 assertOrigin(request);const input=schema.parse(await readBody(request));if('token' in input)await rateLimit('recovery-token:'+input.token,8,3600000);
 if(input.action==='request-reset'){await rateLimit('recovery:'+input.email,3,1800000);const user=await db.user.findUnique({where:{email:input.email}});if(user)await accountToken(user,'RESET');return NextResponse.json({ok:true});}
 if(input.action==='request-verify'){const user=await requireUser(undefined,true);await rateLimit('verification:'+user.id,3,1800000);if(!user.emailVerifiedAt)await accountToken(user,'VERIFY');return NextResponse.json({ok:true});}
 return NextResponse.json(await useAccountToken(input.token,input.action==='reset'?'RESET':'VERIFY',input.action==='reset'?input.password:undefined));
 }catch(error){return NextResponse.json({error:error instanceof HttpError?errorMessage(error.message,request):errorMessage('Hakiki taarifa ulizoingiza / Check the information you entered.',request)},{status:error instanceof HttpError?error.status:error instanceof z.ZodError?400:503});}}
