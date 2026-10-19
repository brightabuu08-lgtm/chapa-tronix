import {assertIsolatedTestServer} from './isolated-server.mjs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PrismaClient} from '../generated/prisma-v6';

if(new URL(process.env.DATABASE_URL||'').pathname!=='/chapa_tronix_test')throw new Error('Use isolated test data.');
const db=new PrismaClient(),base=process.env.TEST_BASE_URL||'http://localhost:3107',uid=randomUUID();
await assertIsolatedTestServer(base);
let cookie='',checks=0;
const password='Audit-Test-Only-Password-12345',email='audit-http-'+uid+'@example.test';
function check(value:unknown,label:string){assert.ok(value,label);checks++;console.log('PASS '+label);}
async function api(route:string,body?:unknown,method=body?'POST':'GET',origin:string|undefined=base){const response=await fetch(base+'/api/'+route,{method,headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {response,data:await response.json()};}
try{
 let result=await api('auth/register',{name:'Audit Customer',email,password,phone:'07'+String(Math.floor(Math.random()*90000000)+10000000)});
 check(result.response.status===201,'customer registration succeeds');cookie=result.response.headers.get('set-cookie')!.split(';')[0];
 const customer=await db.user.findUniqueOrThrow({where:{email}});
 for(const section of ['overview','products','orders','customers','coupons','reviews','quotes','ideas','categories','settings','emails','logs','payment-review','refunds','worker-health']){
  result=await api('admin/'+section);check(result.response.status===403,'customer denied admin '+section);
 }
 result=await api('account/export');check(result.response.ok&&result.data.profile.email===email,'customer can export their own profile');
 check(!/passwordHash|accessTokenHash|idempotencyKey|providerReference/.test(JSON.stringify(result.data)),'export excludes password hashes, order secrets and provider references');
 const archived=await db.product.findFirstOrThrow({where:{active:false}});result=await api('wishlist',{productId:archived.id});check(result.response.status===404,'archived products cannot be exposed through wishlist writes');
 result=await api('account/export?page=invalid');check(result.response.status===400,'invalid export page is rejected');
 const other=await db.user.create({data:{name:'Other Customer',email:'other-'+uid+'@example.test',passwordHash:customer.passwordHash}});
 const address=await db.address.create({data:{userId:other.id,label:'Other home',region:'Dar es Salaam',street:'Test database address only',phone:'+255712345678'}});
 await api('addresses/'+address.id,undefined,'DELETE');check(!!await db.address.findUnique({where:{id:address.id}}),'a customer cannot delete another account’s address');
 result=await api('account/export');check(!JSON.stringify(result.data).includes(other.email)&&!JSON.stringify(result.data).includes(address.id),'personal-data export does not expose another customer');
 result=await api('account',{name:'Changed Customer',phone:customer.phone!,role:'ADMIN'},'PATCH');check(result.response.ok&&(await db.user.findUniqueOrThrow({where:{id:customer.id}})).role==='CUSTOMER','profile input cannot escalate roles');
 result=await api('orders/access',{number:'NONEXISTENT',token:'incorrect-proof'});check(result.response.status===404,'guest order enumeration returns generic not-found');
 const noOrigin=await fetch(base+'/api/account',{method:'PATCH',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({name:'CSRF attempt',phone:'0712345678'})});check(noOrigin.status===403,'missing Origin blocks a mutation');
 const invalid=await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{broken'});check(invalid.status===400,'malformed JSON receives a client error');
 const oversized=await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify({data:'a'.repeat(270000)})});check(oversized.status===413,'oversized JSON is rejected');
 const unauthorizedUpload=await fetch(base+'/api/admin/product-image',{method:'POST',headers:{Origin:base,Cookie:cookie},body:new FormData()});check(unauthorizedUpload.status===403,'customer cannot upload product images');
 await db.user.update({where:{id:customer.id},data:{role:'STAFF'}});
 result=await api('admin/products');check(result.response.ok,'staff can read inventory');
 for(const [route,body] of [['admin/settings',{}],['admin/inventory',{}],['admin/products',{}],['admin/coupons',{}],['admin/refunds',{}]] as const){result=await api(route,body);check(result.response.status===403,'staff cannot mutate '+route);}
 result=await api('auth/logout',{});check(result.response.ok,'staff/customer can log out');
 result=await api('account');check(result.response.status===401,'revoked session cannot access account');cookie='';
 result=await api('account/export');check(result.response.status===401,'anonymous data export is denied');
 for(const route of ['/','/shop','/cart','/checkout','/account','/wishlist','/quote','/ideas','/chat','/learn','/about','/contact','/faq','/privacy','/terms','/returns','/shipping','/track-order','/reset-password','/verify-email','/unsubscribe','/admin']){
  const response=await fetch(base+route);check(response.status===200,'page responds '+route);
  check(!!response.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"),'CSP on '+route);
 }
 const missing=await fetch(base+'/not-a-real-page-'+uid),missingHtml=await missing.text();check((missing.status===404||missing.status===200)&&/<meta[^>]*name="robots"[^>]*content="noindex"/.test(missingHtml)&&/Page not found|Ukurasa haujapatikana|NEXT_HTTP_ERROR_FALLBACK;404/.test(missingHtml),'unknown page renders not-found UI with noindex, including Next streamed responses');
 for(const path of ['/shop/unknown','/contact/extra','/product','/category']){const response=await fetch(base+path),html=await response.text();check(/<meta[^>]*name="robots"[^>]*content="noindex"/.test(html)&&/Page not found|Ukurasa haujapatikana|NEXT_HTTP_ERROR_FALLBACK;404/.test(html),'malformed nested URL is noindex '+path);}
 const head=await fetch(base+'/api/health',{method:'HEAD'});check(head.status===200&&(await head.text())==='','health HEAD returns status without a response body');
 const sitemap=await (await fetch(base+'/sitemap.xml')).text();
 const slugs=await db.product.findMany({where:{active:true},select:{slug:true}});check(slugs.every(p=>sitemap.includes('/product/'+p.slug)),'sitemap includes every active product beyond page one');
 const robots=await (await fetch(base+'/robots.txt')).text();check(robots.includes('/track-order')&&robots.includes('/chat'),'private tracking and chat are disallowed in robots');
 console.log(JSON.stringify({auditHttpChecks:checks,result:'passed'}));
}finally{await db.$disconnect();}
