import {hash,compare} from 'bcryptjs';
import {db} from '../db';
import {HttpError,readBody,rateLimit,currentUser,startSession,endSession,publicUser} from '../auth';
import {loginSchema,registerSchema,normalizePhone} from '../commerce';
import {accountToken} from '../account-tokens';
import {json} from './response';
import {accountDestination,needsEmailVerification} from '../access-policy';
export async function handleAuth(request:Request,route:string){const method=request.method;
if(route==='auth/me'&&method==='GET')return json({user:await currentUser()});
if(route==='auth/register'&&method==='POST'){const input=registerSchema.parse(await readBody(request));await rateLimit('register:'+input.email,4);const user=await db.user.create({data:{name:input.name,email:input.email,phone:input.phone,passwordHash:await hash(input.password,12),role:'CUSTOMER'}});await startSession(user.id);await accountToken(user,'VERIFY').catch(()=>console.error('verification_email_queue_unavailable'));return json({user:publicUser(user),destination:needsEmailVerification(user,process.env.AUTH_REQUIRE_EMAIL_VERIFICATION==='true')?'/account':accountDestination(user)},201)}
if(route==='auth/login'&&method==='POST'){const input=loginSchema.parse(await readBody(request)),identifier=input.identifier.toLowerCase().trim();await rateLimit('login:'+identifier,8);const user=await db.user.findFirst({where:{OR:[{email:identifier},{phone:normalizePhone(identifier)}]}});const valid=await compare(input.password,user?.passwordHash||'$2b$12$LQv3c1yqBWVHxkd0LHAkCOYcVmbKZ2s1mk84sg9D.xjgBkJP4.xOe');if(!user||!valid)throw new HttpError(401,'Email/simu au password si sahihi / Invalid credentials.');await startSession(user.id);return json({user:publicUser(user),destination:needsEmailVerification(user,process.env.AUTH_REQUIRE_EMAIL_VERIFICATION==='true')?'/account':accountDestination(user),verificationRequired:process.env.AUTH_REQUIRE_EMAIL_VERIFICATION==='true'&&user.role==='CUSTOMER'&&!user.emailVerifiedAt})}
if(route==='auth/logout'&&method==='POST'){await endSession();return json({ok:true})}
throw new HttpError(404,'Route not found.');}
