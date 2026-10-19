import {randomBytes} from 'node:crypto';
import {hash} from 'bcryptjs';
import {db} from './db';
import {tokenHash,HttpError} from './auth';
export async function accountToken(user:{id:string;email:string;name:string},purpose:'RESET'|'VERIFY'){
 const raw=randomBytes(32).toString('base64url');const hours=purpose==='VERIFY'?24:1;
 const prefix='account:'+purpose+':'+user.id+':';
 const link=process.env.APP_URL+(purpose==='RESET'?'/reset-password':'/verify-email')+'#token='+encodeURIComponent(raw);
 await db.$transaction(async tx=>{
  await tx.verificationToken.deleteMany({where:{userId:user.id,purpose,usedAt:null}});
  await tx.verificationToken.create({data:{id:tokenHash(raw),userId:user.id,purpose,expiresAt:new Date(Date.now()+hours*3600000)}});
  await tx.emailJob.updateMany({where:{dedupeKey:{startsWith:prefix},status:{in:['PENDING','FAILED']}},data:{status:'CANCELLED'}});
  await tx.emailJob.create({data:{dedupeKey:prefix+tokenHash(raw),recipient:user.email.toLowerCase(),subject:purpose==='RESET'?'chapa tronix - Badilisha nenosiri / Reset password':'chapa tronix - Thibitisha barua pepe / Verify email',text:`Habari ${user.name},\n\n${purpose==='RESET'?'Umeomba kubadilisha nenosiri. / A password reset was requested.':'Thibitisha barua pepe yako. / Verify your email address.'}\n${link}\n\nLink hii inaisha baada ya saa ${hours} na inatumika mara moja. / This link expires in ${hours} hour(s) and can be used once.\nUsipokuwa umeomba hatua hii, puuza ujumbe. / Ignore this email if you did not request it.`}});
 });
}
export async function useAccountToken(raw:string,purpose:'RESET'|'VERIFY',password?:string){
 if(purpose==='RESET'){const candidate=await db.verificationToken.findUnique({where:{id:tokenHash(raw)}});if(!candidate||candidate.purpose!==purpose||candidate.usedAt||candidate.expiresAt<new Date())throw new HttpError(400,'Link imeisha au imetumika. Omba nyingine / Link expired or already used. Request another.');}
 const passwordHash=purpose==='RESET'&&password?await hash(password,12):undefined;
 return db.$transaction(async tx=>{
  const token=await tx.verificationToken.findUnique({where:{id:tokenHash(raw)}});
  if(!token||token.purpose!==purpose||token.usedAt||token.expiresAt<new Date())throw new HttpError(400,'Link imeisha au imetumika. Omba nyingine / Link expired or already used. Request another.');
  const changed=await tx.verificationToken.updateMany({where:{id:token.id,usedAt:null,expiresAt:{gt:new Date()}},data:{usedAt:new Date()}});if(!changed.count)throw new HttpError(400,'Link already used.');
  if(purpose==='RESET'){if(!passwordHash)throw new HttpError(400,'A new password is required.');await tx.user.update({where:{id:token.userId},data:{passwordHash}});await tx.session.deleteMany({where:{userId:token.userId}});}
  else await tx.user.update({where:{id:token.userId},data:{emailVerifiedAt:new Date()}});
  await tx.auditLog.create({data:{userId:token.userId,action:purpose==='RESET'?'PASSWORD_RESET':'EMAIL_VERIFIED',target:token.userId}});
  return {ok:true};
 },{isolationLevel:'Serializable'});
}
