type Attempt={key:string;fingerprint:string;order?:{number:string;status:string;total:number};accessToken?:string;paymentUrl?:string};
const storageKey='ct-checkout-attempt-v1',lastOrderKey='ct-last-checkout-v1';
export function checkoutAttempt(payload:unknown):Attempt{
 const fingerprint=JSON.stringify(payload);
 try{const saved=JSON.parse(sessionStorage.getItem(storageKey)||'null') as Attempt|null;if(saved?.key&&saved.fingerprint===fingerprint)return saved;}catch{}
 const attempt={key:crypto.randomUUID(),fingerprint};sessionStorage.setItem(storageKey,JSON.stringify(attempt));return attempt;
}
export function saveCheckoutResult(result:Omit<Attempt,'key'|'fingerprint'>){try{const attempt=JSON.parse(sessionStorage.getItem(storageKey)||'null');if(attempt)sessionStorage.setItem(storageKey,JSON.stringify({...attempt,...result}));}catch{}}
export function savedCheckout():Attempt|null{try{return JSON.parse(sessionStorage.getItem(storageKey)||sessionStorage.getItem(lastOrderKey)||'null')}catch{return null}}

export function completeCheckoutAttempt(){try{const saved=sessionStorage.getItem(storageKey);if(saved)sessionStorage.setItem(lastOrderKey,saved);sessionStorage.removeItem(storageKey);sessionStorage.removeItem('ct-checkout-draft-v1');}catch{}}

export function cartMatchesCheckout(current:{id:string;variantId?:string;quantity:number}[],ordered:{productId:string;variantId?:string;quantity:number}[]){const normalize=(items:{productId:string;variantId?:string;quantity:number}[])=>JSON.stringify(items.map(i=>({productId:i.productId,variantId:i.variantId||'',quantity:i.quantity})).sort((a,b)=>(a.productId+':'+a.variantId).localeCompare(b.productId+':'+b.variantId)));return normalize(current.map(i=>({productId:i.id,variantId:i.variantId,quantity:i.quantity})))===normalize(ordered);}

const draftKey='ct-checkout-draft-v1';
export function readCheckoutDraft():Record<string,string>|null{
 try{const saved=JSON.parse(sessionStorage.getItem(draftKey)||'null');if(!saved||typeof saved.savedAt!=='number'||Date.now()-saved.savedAt<0||Date.now()-saved.savedAt>2*3600000||!saved.values||typeof saved.values!=='object'||Array.isArray(saved.values))return null;return saved.values;}catch{return null}
}
export function saveCheckoutDraft(values:Record<string,string>){
 try{const allowed=Object.fromEntries(['name','email','phone','street','region','delivery','method','coupon'].filter(key=>typeof values[key]==='string').map(key=>[key,values[key].slice(0,1000)]));sessionStorage.setItem(draftKey,JSON.stringify({savedAt:Date.now(),values:allowed}));}catch{}
}
export function activeCheckout():Attempt|null{try{return JSON.parse(sessionStorage.getItem(storageKey)||'null')}catch{return null}}
export function clearCheckoutSession(){try{for(const key of [storageKey,lastOrderKey,draftKey])sessionStorage.removeItem(key);}catch{}}
