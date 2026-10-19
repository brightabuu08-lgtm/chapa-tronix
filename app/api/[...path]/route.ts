import {handleAdmin} from '@/lib/api/admin-routes';
import {handleAuth} from '@/lib/api/auth-routes';
import {handleCatalog} from '@/lib/api/catalog-routes';
import {logEvent} from '@/lib/logging';
import {randomUUID} from 'node:crypto';
import {NextResponse} from 'next/server';
import {z,ZodError} from 'zod';

import {Prisma} from '../../../generated/prisma-v6';
import {db} from '@/lib/db';
import {errorMessage} from '@/lib/api-errors';
import {HttpError,assertOrigin,readBody,rateLimit,assertVerified,currentUser,requireUser,publicUser} from '@/lib/auth';
import {normalizePhone,addressSchema,phoneSchema} from '@/lib/commerce';
import {createOrder,orderAccessToken} from '@/lib/orders';

import {pagination} from '@/lib/catalog-query';

import {adjustInventory} from '@/lib/inventory';
import {limitedText} from '@/lib/body-limit';
import {applyVerifiedPayment,resumePayment,accessibleOrder} from '@/lib/payment-lifecycle';
import {confirmCod} from '@/lib/maintenance';
import {orderEmailTx} from '@/lib/mail';
import {accountToken} from '@/lib/account-tokens';
import {businessSettings} from '@/lib/business';
import {assertSellingMode} from '@/lib/selling-mode';
import {mailConfigured} from '@/lib/mail';
import {ideaSchema} from '@/lib/ideas';

import {paymentsEnabled,cashOnly,validWebhook,verifyPayment} from '@/lib/payments';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{path:string[]}>};
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});

async function handle(request:Request,context:Context){try{const {path}=await context.params;const route=path.join('/'),method=request.method;if(method!=='GET'&&route!=='payments/webhook')assertOrigin(request);if(route==='config'){const visitor=await currentUser(),settings=process.env.DATABASE_URL?await businessSettings():undefined;let acceptingOrders=false;try{if(settings){assertSellingMode(settings);acceptingOrders=true;}}catch{}return json({acceptingOrders,cashOnly:cashOnly(),sellingMode:process.env.SELLING_MODE||'closed',verificationRequired:process.env.AUTH_REQUIRE_EMAIL_VERIFICATION==='true',...(process.env.SELLING_MODE==='test'?{testRunId:process.env.AUDIT_RUN_ID,isolatedTestDatabase:new URL(process.env.DATABASE_URL||'http://not-configured').pathname==='/chapa_tronix_test'}:{}),business:visitor&&!(process.env.AUTH_REQUIRE_EMAIL_VERIFICATION==='true'&&visitor.role==='CUSTOMER'&&!visitor.emailVerifiedAt)&&process.env.DATABASE_URL?settings:undefined,payments:paymentsEnabled(),databaseConfigured:!!process.env.DATABASE_URL,mailConfigured:mailConfigured(),imageStorage:process.env.S3_BUCKET&&process.env.S3_ENDPOINT?'s3':'local'});}if(!process.env.DATABASE_URL)throw new HttpError(503,'Duka halijaunganishwa na database / Store database is not configured.');
 if(route==='health'&&method==='GET'){await db.$queryRaw`SELECT 1`;return json({ok:true});}
 const publicCatalog=method==='GET'&&(route==='catalog'||path[0]==='products');
 const publicForm=method==='POST'&&['quotes','ideas','orders/access','coupons/validate'].includes(route);
 if(!publicCatalog&&!publicForm&&!['auth','health'].includes(path[0])&&route!=='payments/webhook'&&route!=='newsletter')await requireUser();
 if(route==='catalog'||path[0]==='products')return await handleCatalog(request,path);
 if(path[0]==='auth')return await handleAuth(request,route);
 if(route==='checkout'&&method==='POST'){const input=await readBody(request);await rateLimit('checkout:'+String(input.phone),12);const user=await requireUser();const order=await createOrder(input,user.id);let paymentUrl:string|undefined,paymentError:string|undefined;if(order.method!=='cod'&&order.status==='PENDING')try{paymentUrl=await resumePayment(order.id)}catch(error){paymentError=error instanceof HttpError?error.message:'Payment initiation unavailable.'}return json({order:{number:order.number,status:order.status,total:order.total},accessToken:orderAccessToken(order.idempotencyKey),paymentUrl,paymentError},201)}
 if(route==='orders/access'&&method==='POST'){const input=z.object({number:z.string().max(80),token:z.string().max(100).optional(),action:z.enum(['track','resume']).default('track')}).parse(await readBody(request));const user=await currentUser();await rateLimit('order-access:'+input.number+':'+(user?.id||input.token||'anonymous'),30,60000);if(user)assertVerified(user);const order=await accessibleOrder(input.number,input.token,user);if(input.action==='resume')return json({paymentUrl:await resumePayment(order.id)});return json({order:{number:order.number,status:order.status,method:order.method,tracking:order.tracking,subtotal:order.subtotal,shipping:order.shipping,discount:order.discount,total:order.total,taxAmount:order.taxAmount,taxMode:order.taxMode,taxLabel:order.taxLabel,items:order.items.map(i=>({name:i.name,quantity:i.quantity,unitPrice:i.unitPrice})),reservationExpiresAt:order.reservationExpiresAt}});}
 if(route==='payments/webhook'&&method==='POST'){const raw=await limitedText(request);if(!validWebhook(raw,request.headers,process.env.FLUTTERWAVE_WEBHOOK_SECRET||''))throw new HttpError(401,'Invalid webhook signature.');let body;try{body=JSON.parse(raw)}catch{throw new HttpError(400,'Invalid JSON.');}if(body.event!=='charge.completed'&&body.type!=='charge.completed')return json({received:true});const id=z.union([z.string(),z.number()]).parse(body.data?.id);await applyVerifiedPayment(await verifyPayment(String(id)));return json({received:true})}
 if(route==='coupons/validate'&&method==='POST'){const input=z.object({code:z.string().max(40),subtotal:z.number().int().min(0)}).parse(await readBody(request));await rateLimit('coupon-preview:'+(request.headers.get('cf-connecting-ip')||'local'),30,60000);const c=await db.coupon.findUnique({where:{code:input.code.toUpperCase()}});if(!c||!c.active||c.expiresAt<new Date()||c.used>=c.limit||input.subtotal<c.minimum)throw new HttpError(400,'Coupon si halali / Invalid coupon.');return json({percent:c.percent})}
 if(route==='quotes'&&method==='POST'){const input=z.object({name:z.string().min(2).max(100),email:z.email(),phone:phoneSchema,organization:z.string().min(2).max(200),details:z.string().min(15).max(10000)}).parse(await readBody(request));await rateLimit('quote:'+input.email,5);await db.quote.create({data:input});return json({ok:true},201)}
 if(route==='ideas'&&method==='POST'){const input=ideaSchema.parse(await readBody(request));await rateLimit('idea:'+input.email,3);const {consent,...data}=input;const idea=await db.ideaSubmission.create({data:{...data,consentAt:new Date()}});return json({reference:idea.id},201)}
 if(route==='newsletter'&&method==='POST'){const input=z.object({email:z.email(),action:z.enum(['subscribe','unsubscribe']).default('subscribe'),consent:z.boolean().optional()}).refine(v=>v.action==='unsubscribe'||v.consent===true).parse(await readBody(request));await rateLimit('newsletter:'+input.email.toLowerCase(),10,60000);await db.newsletterSubscriber.upsert({where:{email:input.email.toLowerCase()},create:{email:input.email.toLowerCase(),active:input.action==='subscribe'},update:{active:input.action==='subscribe',...(input.action==='subscribe'?{consentAt:new Date()}:{})}});return json({ok:true})}
 if(route==='account'){const user=await requireUser();if(method==='GET'){const {page,pageSize}=pagination(new URL(request.url));const [orders,total,addresses]=await Promise.all([db.order.findMany({where:{userId:user.id},select:{id:true,number:true,status:true,createdAt:true,name:true,street:true,region:true,delivery:true,method:true,subtotal:true,shipping:true,discount:true,total:true,taxAmount:true,taxMode:true,taxLabel:true,tracking:true,reservationExpiresAt:true,items:{select:{id:true,productId:true,variantId:true,name:true,quantity:true,unitPrice:true}}},orderBy:[{createdAt:'desc'},{id:'asc'}],skip:(page-1)*pageSize,take:pageSize}),db.order.count({where:{userId:user.id}}),db.address.findMany({where:{userId:user.id}})]);return json({orders,total,page,hasMore:page*pageSize<total,addresses});}if(method==='PATCH'){const input=z.object({name:z.string().min(2).max(100),phone:phoneSchema.transform(normalizePhone)}).parse(await readBody(request));const updated=await db.user.update({where:{id:user.id},data:input});return json({user:publicUser(updated)})}}
 if(path[0]==='addresses'){const user=await requireUser();if(method==='POST')return json(await db.address.create({data:{...addressSchema.parse(await readBody(request)),userId:user.id}}),201);if(method==='DELETE'){await db.address.deleteMany({where:{id:path[1],userId:user.id}});return json({ok:true})}}
 if(route==='wishlist'){const user=await requireUser();if(method==='GET')return json(await db.wishlist.findMany({where:{userId:user.id,product:{active:true}},include:{product:true}}));if(method==='DELETE'){const {productId}=z.object({productId:z.string()}).parse(await readBody(request));await db.wishlist.deleteMany({where:{userId:user.id,productId}});return json({ok:true});}if(method==='POST'){const {productId}=z.object({productId:z.string()}).parse(await readBody(request));if(!await db.product.findFirst({where:{id:productId,active:true}}))throw new HttpError(404,'Product not found.');await db.wishlist.upsert({where:{userId_productId:{userId:user.id,productId}},create:{userId:user.id,productId},update:{}});return json({ok:true})}}
 if(route==='reviews'&&method==='POST'){const user=await requireUser(),input=z.object({productId:z.string(),rating:z.number().int().min(1).max(5),text:z.string().min(10).max(2000)}).parse(await readBody(request));const purchase=await db.orderItem.findFirst({where:{productId:input.productId,order:{userId:user.id,status:{in:['PAID','PACKED','SHIPPED','DELIVERED']}}}});if(!purchase)throw new HttpError(403,'Maoni yanahitaji ununuzi uliothibitishwa / A verified purchase is required.');return json(await db.review.upsert({where:{userId_productId:{userId:user.id,productId:input.productId}},create:{...input,userId:user.id},update:{rating:input.rating,text:input.text,approved:false}}),201)}
 if(path[0]==='admin')return await handleAdmin(request,path);
 throw new HttpError(404,'Route not found.');
 }catch(error){if(error instanceof HttpError)return json({error:errorMessage(error.message,request)},error.status);if(error instanceof ZodError)return json({error:!/^sw(?:-|,|;|$)/i.test(request.headers.get('accept-language')||'')?'Check the highlighted information: '+error.issues.map(i=>i.path.join('.')).join(', '):'Tafadhali hakiki taarifa ulizojaza. Sehemu zinazohitaji marekebisho: '+error.issues.map(i=>i.path.join('.')).join(', ')},400);if(error instanceof Error&&'code' in error){if((error as {code:string}).code==='P2002')return json({error:errorMessage('Taarifa hizi tayari zipo / This record already exists.',request)},409);if(error.code==='P2034')return json({error:errorMessage('Oda inashughulikiwa. Jaribu tena / Conflict. Please retry.',request)},409);if(error.code==='P2025')return json({error:'Record not found.'},404);}logEvent('api_failure',{requestId:randomUUID(),errorType:error instanceof Error?error.name:'Unknown'});return json({error:errorMessage('Huduma haipatikani kwa sasa / Service temporarily unavailable.',request)},503);}}
export const GET=handle;export const POST=handle;export const PATCH=handle;export const DELETE=handle;

export async function HEAD(request:Request,context:Context){const response=await handle(new Request(request,{method:'GET'}),context);return new Response(null,{status:response.status,headers:response.headers});}
