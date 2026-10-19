import {ZodError} from 'zod';
import {HttpError} from '@/lib/auth';
import {limitedText} from '@/lib/body-limit';
import {validSmsSignature} from '@/lib/sms-provider';
import {applySmsReceipt} from '@/lib/sms';
import {json} from '@/lib/api/response';
export const runtime='nodejs';
export const dynamic='force-dynamic';
// This signature belongs to the documented custom adapter, never to Beem.
export async function POST(request:Request){try{
 if(process.env.SMS_PROVIDER!=='custom')return json({error:'SMS callback is disabled.'},503);
 const raw=await limitedText(request,16384);
 if(!validSmsSignature(raw,request.headers.get('x-sms-timestamp'),request.headers.get('x-sms-signature'),process.env.SMS_CUSTOM_WEBHOOK_SECRET||''))return json({error:'Invalid SMS callback signature.'},401);
 let body:unknown;try{body=JSON.parse(raw);}catch{return json({error:'Invalid JSON.'},400);}
 return json(await applySmsReceipt(body));
 }catch(error){if(error instanceof HttpError)return json({error:error.message},error.status);if(error instanceof ZodError)return json({error:'Invalid SMS callback.'},400);return json({error:'SMS callback could not be processed. Please retry.'},503);}}
