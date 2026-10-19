import {HttpError} from './auth';
export async function limitedText(request:Request,limit=262144){
 if(Number(request.headers.get('content-length')||0)>limit)throw new HttpError(413,'Request too large.');
 if(!request.body)return '';
 const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new HttpError(413,'Request too large.');}chunks.push(value);}
 return Buffer.concat(chunks).toString('utf8');
}
