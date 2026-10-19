import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import path from 'node:path';
import {requireUser,rateLimit,HttpError} from '@/lib/auth';
import {isAllowedRequestOrigin} from '@/lib/request-origin';
import {imageDirectory,uploadedImage} from '@/lib/product-images';
import {db} from '@/lib/db';
import {S3Client,PutObjectCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){let target:string|undefined;let remoteKey:string|undefined;let client:S3Client|undefined;
 try{
  if(!isAllowedRequestOrigin(request,process.env))throw new HttpError(403,'Website origin is not allowed.');
  const user=await requireUser(['ADMIN']);await rateLimit('product-image:'+user.id,40,3600000);
  const bytes=await uploadedImage(request),filename=randomUUID()+'.webp';
  let publicUrl='/media/'+filename;
  if(process.env.S3_BUCKET&&process.env.S3_ENDPOINT){if(!process.env.S3_PUBLIC_URL||!process.env.S3_ACCESS_KEY_ID||!process.env.S3_SECRET_ACCESS_KEY)throw new HttpError(503,'Storage configuration is incomplete.');client=new S3Client({region:process.env.S3_REGION||'auto',endpoint:process.env.S3_ENDPOINT,credentials:{accessKeyId:process.env.S3_ACCESS_KEY_ID,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY}});remoteKey='products/'+filename;await client.send(new PutObjectCommand({Bucket:process.env.S3_BUCKET,Key:remoteKey,Body:bytes,ContentType:'image/webp'}));publicUrl=process.env.S3_PUBLIC_URL.replace(/\/$/,'')+'/'+remoteKey;}
  else{await mkdir(imageDirectory(),{recursive:true});target=path.join(imageDirectory(),filename);await writeFile(target,bytes,{flag:'wx'});}
  await db.auditLog.create({data:{userId:user.id,action:'PRODUCT_IMAGE_UPLOAD',target:filename}});
  return NextResponse.json({publicUrl},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch(e){if(target)await unlink(target).catch(()=>{});if(client&&remoteKey)await client.send(new DeleteObjectCommand({Bucket:process.env.S3_BUCKET,Key:remoteKey})).catch(()=>{});return NextResponse.json({error:e instanceof HttpError?e.message:'Picha haijapakiwa. Jaribu tena / Image upload failed. Try again.'},{status:e instanceof HttpError?e.status:503,headers:{'Cache-Control':'no-store'}});}
}
