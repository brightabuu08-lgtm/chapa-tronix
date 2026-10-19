import sharp from 'sharp';
import path from 'node:path';
import {HttpError} from './auth';
export const imageFilename=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.webp$/i;
export const isLocalProductImage=(value:string)=>value.startsWith('/media/')&&imageFilename.test(value.slice(7));
export const imageDirectory=()=>path.resolve(process.env.PRODUCT_UPLOAD_DIR||path.join(process.cwd(),'.uploads'));
export async function uploadedImage(request:Request){
 const contentType=request.headers.get('content-type')||'';
 if(!contentType.startsWith('multipart/form-data;'))throw new HttpError(415,'Chagua faili la picha / Select an image file.');
 const limit=5*1024*1024+65536;
 if(Number(request.headers.get('content-length')||0)>limit)throw new HttpError(413,'Picha isizidi MB 5 / Image must be under 5 MB.');
 if(!request.body)throw new HttpError(400,'Picha haijatumwa / No image received.');
 const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>limit){await reader.cancel();throw new HttpError(413,'Picha isizidi MB 5 / Image must be under 5 MB.');}chunks.push(part.value);}
 let form:FormData;try{form=await new Response(new Uint8Array(Buffer.concat(chunks)),{headers:{'Content-Type':contentType}}).formData();}catch{throw new HttpError(400,'Faili halijatumwa vizuri / Invalid upload.');}
 const file=form.get('file');
 if(!(file instanceof File)||!file.size||file.size>5*1024*1024)throw new HttpError(400,'Chagua picha yenye ukubwa usiozidi MB 5 / Select an image under 5 MB.');
 const formats:Record<string,string>={'image/jpeg':'jpeg','image/png':'png','image/webp':'webp'};
 if(!formats[file.type])throw new HttpError(415,'Tumia JPG, PNG au WebP / Use JPG, PNG or WebP.');
 try{
  const input=Buffer.from(await file.arrayBuffer());
  const metadata=await sharp(input,{limitInputPixels:25000000,animated:false}).metadata();
  if(metadata.format!==formats[file.type]||!metadata.width||!metadata.height)throw new Error('Invalid image type.');
  return await sharp(input,{limitInputPixels:25000000,animated:false}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:88}).toBuffer();
 }catch{throw new HttpError(400,'Picha haisomeki. Chagua picha halali ya JPG, PNG au WebP / Invalid image. Choose a valid JPG, PNG or WebP.');}
}
