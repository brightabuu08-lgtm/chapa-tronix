import {db} from './db';
import {checkoutSchema,totals,withTax} from './commerce';
import {HttpError} from './auth';
import {paymentsEnabled,cashOnly} from './payments';
import {createHash,createHmac,randomBytes} from 'node:crypto';
import {businessSettings,shippingCost} from './business';
import {regions} from './catalog';
import {assertSellingMode} from './selling-mode';
import {orderEmailTx} from './mail';
export function checkoutFingerprint(input:ReturnType<typeof checkoutSchema.parse>,userId?:string){const {idempotencyKey,...payload}=input;return createHash('sha256').update(JSON.stringify({...payload,email:payload.email.toLowerCase(),coupon:payload.coupon?.toUpperCase()||'',items:[...payload.items].sort((a,b)=>(a.productId+':'+(a.variantId||'')).localeCompare(b.productId+':'+(b.variantId||''))),userId:userId||null})).digest('hex');}
export function orderAccessToken(key:string){const secret=process.env.ORDER_ACCESS_SECRET;if(!secret||secret.length<32)throw new HttpError(503,'Order access security is not configured.');return createHmac('sha256',secret).update('order-access:'+key).digest('base64url');}
export async function createOrder(body:unknown,userId?:string){
 const input=checkoutSchema.parse(body);if(cashOnly()&&input.method!=='cod')throw new HttpError(400,'Only cash payment is available.');const business=await businessSettings();assertSellingMode(business);
 if(input.method==='cod'&&!business.codEnabled)throw new HttpError(400,'Cash payment is unavailable.');
 if(input.delivery==='pickup'&&!business.pickupEnabled)throw new HttpError(400,'Store pickup is unavailable.');
 if(!regions.includes(input.region))throw new HttpError(400,'Chagua mkoa halali / Choose a valid region.');
 const fingerprint=checkoutFingerprint(input,userId),accessToken=orderAccessToken(input.idempotencyKey);
 if(new Set(input.items.map(i=>i.productId+':'+(i.variantId||''))).size!==input.items.length)throw new HttpError(400,'Duplicate cart items.');
 return retryTransaction(()=>db.$transaction(async tx=>{
  const existing=await tx.order.findUnique({where:{idempotencyKey:input.idempotencyKey}});
  if(existing){if(existing.payloadFingerprint!==fingerprint)throw new HttpError(409,'Checkout details changed. Start a new checkout attempt.');return existing;}
  if(input.method!=='cod'&&!paymentsEnabled())throw new HttpError(503,'Online payments are not configured.');
  if(input.method==='cod'){
   // Pending reservations are bounded per verified account or normalized contact, never store-wide.
   const pending=await tx.order.count({where:{status:'PENDING',method:'cod',confirmedAt:null,stockReleased:false,OR:[{phone:input.phone},{email:input.email.toLowerCase()},...(userId?[{userId}]:[])]}});
   if(pending>=3)throw new HttpError(429,'Thibitisha oda zako zilizopo kwanza / Confirm your existing orders first.');
  }
  const items=[];
  for(const i of input.items){
   const p=await tx.product.findUnique({where:{id:i.productId}});if(!p?.active)throw new HttpError(400,'Bidhaa haipatikani / Product unavailable.');let price=p.price,name=p.name;
   if(i.variantId){const v=await tx.variant.findUnique({where:{id:i.variantId}});if(!v||!v.active||v.productId!==p.id)throw new HttpError(400,'Invalid variant.');const changed=await tx.variant.updateMany({where:{id:v.id,stock:{gte:i.quantity}},data:{stock:{decrement:i.quantity},inventoryVersion:{increment:1}}});if(!changed.count)throw new HttpError(409,'Stock haitoshi / Insufficient stock: '+v.name);price=v.price;name+=' — '+v.name;}
   else{const changed=await tx.product.updateMany({where:{id:p.id,stock:{gte:i.quantity}},data:{stock:{decrement:i.quantity},inventoryVersion:{increment:1}}});if(!changed.count)throw new HttpError(409,'Stock haitoshi / Insufficient stock: '+p.name);}
   items.push({productId:p.id,variantId:i.variantId,name,quantity:i.quantity,unitPrice:price});await tx.inventoryMovement.create({data:{productId:p.id,variantId:i.variantId,delta:-i.quantity,reason:'Order reservation',actorId:userId||'guest'}});
  }
  const subtotal=items.reduce((s,i)=>s+i.quantity*i.unitPrice,0);let percent=0;
  if(input.coupon){const coupon=await tx.coupon.findUnique({where:{code:input.coupon.toUpperCase()}});if(!coupon||!coupon.active||coupon.expiresAt<new Date()||coupon.used>=coupon.limit||subtotal<coupon.minimum)throw new HttpError(400,'Coupon haitumiki kwa oda hii / Coupon cannot be used.');const updated=await tx.coupon.updateMany({where:{code:coupon.code,used:{lt:coupon.limit}},data:{used:{increment:1}}});if(!updated.count)throw new HttpError(409,'Coupon limit reached.');percent=coupon.percent;}
  const calculated=withTax(totals(items,shippingCost(business,input.region,input.delivery),percent),business),rate=business.taxRateBps,taxAmount=calculated.taxAmount;
  if(calculated.subtotal>2147483647||calculated.total>2147483647)throw new HttpError(400,'Please request a quote for an order this large.');
  const minutes=input.method==='cod'?Math.max(15,Number(process.env.COD_CONFIRMATION_MINUTES)||120):Math.max(15,Number(process.env.ORDER_RESERVATION_MINUTES)||60);
  const order=await tx.order.create({data:{number:'CT-'+Date.now().toString(36).toUpperCase()+'-'+randomBytes(3).toString('hex').toUpperCase(),idempotencyKey:input.idempotencyKey,payloadFingerprint:fingerprint,accessTokenHash:createHash('sha256').update(accessToken).digest('hex'),couponCode:input.coupon?.toUpperCase()||null,reservationExpiresAt:new Date(Date.now()+minutes*60000),userId,name:input.name,email:input.email.toLowerCase(),phone:input.phone,region:input.region,street:input.street,delivery:input.delivery,method:input.method,...calculated,taxRateBps:rate,taxAmount,taxMode:business.taxMode,taxLabel:business.taxLabel||null,items:{create:items}}});
  await orderEmailTx(tx,order);return order;
 },{isolationLevel:'Serializable',timeout:15000}));
}
export async function retryTransaction<T>(work:()=>Promise<T>):Promise<T>{for(let attempt=0;attempt<4;attempt++){try{return await work()}catch(error){if(!(error instanceof Error)||!('code' in error)||!['P2034','P2002'].includes(String(error.code))||attempt===3)throw error;}}throw new HttpError(409,'Please retry your order.');}
