import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {imageDirectory,imageFilename} from '@/lib/product-images';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{name:string}>}){
 const {name}=await params;if(!imageFilename.test(name))return new Response('Not found',{status:404});
 try{const bytes=await readFile(path.join(imageDirectory(),name));return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'image/webp','Content-Length':String(bytes.length),'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});}catch{return new Response('Not found',{status:404});}
}
