type Environment = Record<string, string | undefined>;
export type OutgoingEmail = {id:string;recipient:string;subject:string;text:string};

export function mailConfigured(env:Environment=process.env){
 return !!env.MAIL_FROM && (env.MAIL_PROVIDER==='brevo' ? !!env.BREVO_API_KEY : env.MAIL_PROVIDER==='resend' && !!env.RESEND_API_KEY);
}

/** Called by the outbox worker only. Provider acceptance does not prove inbox delivery. */
export async function deliverEmail(job:OutgoingEmail,env:Environment=process.env,request:typeof fetch=fetch){
 if(!mailConfigured(env))throw new Error('mail_not_configured');
 const brevo=env.MAIL_PROVIDER==='brevo';
 const response=await request(brevo?'https://api.brevo.com/v3/smtp/email':'https://api.resend.com/emails',{
  method:'POST',
  headers:brevo?{'api-key':env.BREVO_API_KEY!,'Content-Type':'application/json'}:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':job.id},
  body:JSON.stringify(brevo?{
   sender:{email:env.MAIL_FROM,name:env.MAIL_FROM_NAME||'chapa tronix'},
   to:[{email:job.recipient}],subject:job.subject,textContent:job.text,
   headers:{IdempotencyKey:job.id},
   ...(env.MAIL_REPLY_TO?{replyTo:{email:env.MAIL_REPLY_TO}}:{})
  }:{from:env.MAIL_FROM,to:[job.recipient],subject:job.subject,text:job.text,...(env.MAIL_REPLY_TO?{reply_to:env.MAIL_REPLY_TO}:{})}),
  signal:AbortSignal.timeout(15000)
 });
 if(!response.ok)throw new Error('mail_provider_rejected');
 const result=await response.json();
 const reference=brevo?result.messageId:result.id;
 if(typeof reference!=='string'||!reference)throw new Error('mail_provider_response_invalid');
 return reference;
}
