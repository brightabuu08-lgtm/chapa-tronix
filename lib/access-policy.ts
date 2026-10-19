export type AccessUser={role:string;emailVerifiedAt?:Date|string|null};
export const publicAccessPages=new Set(['/','/shop','/checkout','/quote','/ideas','/chat','/cart','/wishlist','/learn','/about','/faq','/shipping','/returns','/track-order','/account','/admin','/reset-password','/verify-email','/privacy','/terms','/contact','/unsubscribe']);
export function isPublicAccessPage(path:string){return publicAccessPages.has(path)||/^\/(product|category|learn)\/[^/]+$/.test(path);}
export function accountDestination(user:AccessUser){return user.role==='ADMIN'||user.role==='STAFF'?'/admin':'/';}
export function needsEmailVerification(user:AccessUser|null|undefined,required:boolean){return !!user&&required&&user.role==='CUSTOMER'&&!user.emailVerifiedAt;}
export function accessRedirect(path:string,user:AccessUser|null,verificationRequired=false):string|null{
 if(!user)return isPublicAccessPage(path)?null:'/account';
 if(path==='/account'&&user.role!=='CUSTOMER')return '/admin';
 if(path==='/admin'&&user.role==='CUSTOMER')return needsEmailVerification(user,verificationRequired)?'/account':'/';
 if(needsEmailVerification(user,verificationRequired)&&!isPublicAccessPage(path))return '/account';
 return null;
}

// The checkout handoff accepts one internal destination, never an arbitrary URL.
export function signInDestination(user:AccessUser,destination:string|undefined,next:string|null){return next==='/checkout'&&user.role==='CUSTOMER'&&destination!=='/account'?'/checkout':destination||accountDestination(user);}
