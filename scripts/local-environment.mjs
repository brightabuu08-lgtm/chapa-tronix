import {sharingEnvironment} from './start-ngrok-site.mjs';

// The public origin must reach Next.js before it loads .env and next.config.ts.
/** @param {{port?:number,testMode?:boolean,publicUrl?:string}} options */
export function localEnvironment({port=5186,testMode=false,publicUrl}={}){
 const localUrl=`http://localhost:${port}`;
 const origins={APP_URL:localUrl,NEXT_PUBLIC_APP_URL:localUrl,TRUSTED_ORIGINS:`${localUrl},http://127.0.0.1:${port}`};
 return {PUBLIC_SITE_URL:testMode?'':publicUrl||'',...(!testMode&&publicUrl?sharingEnvironment(publicUrl,port):origins)};
}
