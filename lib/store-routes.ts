const pages=new Set(['shop','cart','checkout','account','quote','ideas','chat','reset-password','verify-email','unsubscribe','learn','about','contact','privacy','terms','returns','shipping','faq','admin','wishlist','track-order']);
export function isStoreRoute(path:readonly string[]){
 if(!path.length)return true;
 if(path[0]==='product'||path[0]==='category')return path.length===2&&path[1].length>0;
 if(path[0]==='learn')return path.length<=2;
 return path.length===1&&pages.has(path[0]);
}
