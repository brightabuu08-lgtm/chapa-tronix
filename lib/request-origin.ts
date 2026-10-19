export function allowedRequestOrigins(requestUrl:string,env:{APP_URL?:string;TRUSTED_ORIGINS?:string;NODE_ENV?:string}){
 const result=new Set<string>();
 for(const value of [env.APP_URL,...(env.TRUSTED_ORIGINS||'').split(',')]){
  if(!value?.trim())continue;
  try{const url=new URL(value.trim());if(['http:','https:'].includes(url.protocol)&&!url.username&&!url.password)result.add(url.origin);}catch{}
 }
 // Local development uses the actual port; public hosts must be explicitly configured.
 if(env.NODE_ENV!=='production'){
  const url=new URL(requestUrl);
  if(['localhost','127.0.0.1','[::1]'].includes(url.hostname))result.add(url.origin);
 }
 return result;
}
export function isAllowedRequestOrigin(request:Request,env:{APP_URL?:string;TRUSTED_ORIGINS?:string;NODE_ENV?:string}){
 const origin=request.headers.get('origin');
 return !!origin&&origin!=='null'&&allowedRequestOrigins(request.url,env).has(origin);
}
