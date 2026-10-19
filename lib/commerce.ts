import {z} from 'zod';
export const phoneSchema=z.string().regex(/^(\+255|0)[67]\d{8}$/,'Tumia namba sahihi ya Tanzania, mfano 0712345678.');
export const passwordSchema=z.string().min(12,'Tumia nenosiri lenye angalau vibambo 12.').max(72).refine(value=>new TextEncoder().encode(value).length<=72,'Nenosiri limezidi ukubwa unaoruhusiwa / Password must not exceed 72 UTF-8 bytes.');
export const normalizePhone=(phone:string)=>phone.startsWith('0')?'+255'+phone.slice(1):phone;
export const addressSchema=z.object({label:z.string().min(2).max(60),region:z.string().min(2).max(60),street:z.string().min(5).max(300),phone:phoneSchema.transform(normalizePhone)});
export const checkoutSchema=z.object({name:z.string().min(2).max(100),email:z.email(),phone:phoneSchema.transform(normalizePhone),region:z.string().min(2).max(60),street:z.string().min(5).max(300),delivery:z.enum(['delivery','pickup']),method:z.enum(['cod','mobile','card']),coupon:z.string().max(40).optional(),items:z.array(z.object({productId:z.string().max(80),variantId:z.string().max(80).optional(),quantity:z.number().int().min(1).max(100)})).min(1).max(50),idempotencyKey:z.uuid()});
export const registerSchema=z.object({name:z.string().trim().min(2).max(100),email:z.email().transform(v=>v.toLowerCase()),phone:phoneSchema.transform(normalizePhone).optional(),password:passwordSchema}).strict();
export const loginSchema=z.object({identifier:z.string().min(3).max(254),password:z.string().min(1).max(72)});
export function deliveryFee(region:string,delivery:string){return delivery==='pickup'?0:region==='Dar es Salaam'?5000:10000;}
export function totals(items:{quantity:number;unitPrice:number}[],shipping:number,percent=0){const subtotal=items.reduce((s,i)=>s+i.quantity*i.unitPrice,0);const discount=Math.floor(subtotal*Math.min(100,Math.max(0,percent))/100);return {subtotal,shipping,discount,total:subtotal+shipping-discount};}
export const transitions:Record<string,string[]>={PENDING:['PAID','CANCELLED'],PAID:['PACKED','REFUNDED'],PACKED:['SHIPPED','CANCELLED'],SHIPPED:['DELIVERED'],DELIVERED:['REFUNDED'],CANCELLED:[],REFUNDED:[]};
export function canTransition(from:string,to:string,method:string){return (transitions[from]||[]).includes(to)||(from==='PENDING'&&to==='PACKED'&&method==='cod');}
export const csvCell=(value:unknown)=>'"'+String(value??'').replace(/^[\s\uFEFF]*[=+@-]/,"'$&").replaceAll('"','""')+'"';

export function withTax(calculated:ReturnType<typeof totals>,business:{taxMode:string;taxRateBps:number|null}){const rate=business.taxRateBps,taxBase=calculated.subtotal-calculated.discount;const taxAmount=rate===null?0:business.taxMode==='INCLUSIVE'?Math.round(taxBase*rate/(10000+rate)):business.taxMode==='EXCLUSIVE'?Math.round(taxBase*rate/10000):0;return {...calculated,taxAmount,total:calculated.total+(business.taxMode==='EXCLUSIVE'?taxAmount:0)};}
