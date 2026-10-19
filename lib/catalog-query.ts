import {db} from './db';
import {Prisma} from '../generated/prisma-v6';
import {z} from 'zod';
import {categoryMatches} from './category-tree';
export const pageSchema=z.object({page:z.coerce.number().int().min(1).max(100000).default(1),pageSize:z.coerce.number().int().min(1).max(100).default(24)});
export function pagination(url:URL){return pageSchema.parse(Object.fromEntries([...url.searchParams].filter(([k])=>['page','pageSize'].includes(k))));}
export async function catalogPage(url:URL){
 const {page,pageSize}=pagination(url),params=url.searchParams;
 const filter=z.object({q:z.string().max(200).default(''),category:z.string().max(80).default(''),brand:z.string().max(80).default(''),voltage:z.string().max(100).default(''),interface:z.string().max(100).default(''),max:z.coerce.number().nonnegative().optional(),stock:z.enum(['true','false']).default('false'),sort:z.enum(['new','featured','price-up','price-down','name']).default('new'),project:z.enum(['robot','home','cnc']).optional()}).parse(Object.fromEntries([...params].filter(([k])=>['q','category','brand','voltage','interface','max','stock','sort','project'].includes(k))));
 const categories=await db.category.findMany({where:{active:true},orderBy:{name:'asc'}}),clauses:Prisma.Sql[]=[Prisma.sql`p.active=true`];
 if(filter.category){const ids=categories.filter(c=>categoryMatches(c.id,filter.category,categories)).map(c=>c.id);clauses.push(ids.length?Prisma.sql`p."categoryId" IN (${Prisma.join(ids)})`:Prisma.sql`false`);}
 if(filter.q)clauses.push(Prisma.sql`(p.name ILIKE ${'%'+filter.q+'%'} OR p.sku ILIKE ${'%'+filter.q+'%'} OR p.specs::text ILIKE ${'%'+filter.q+'%'})`);
 if(filter.brand)clauses.push(Prisma.sql`p.brand=${filter.brand}`);if(filter.voltage)clauses.push(Prisma.sql`p.voltage=${filter.voltage}`);if(filter.interface)clauses.push(Prisma.sql`p.interface=${filter.interface}`);
 const effectivePrice=Prisma.sql`LEAST(CASE WHEN p.stock>0 OR NOT EXISTS (SELECT 1 FROM "Variant" v WHERE v."productId"=p.id AND v.active=true) THEN p.price ELSE 2147483647 END, COALESCE((SELECT MIN(v.price) FROM "Variant" v WHERE v."productId"=p.id AND v.active=true),p.price))`;
 if(filter.max!==undefined)clauses.push(Prisma.sql`${effectivePrice}<=${filter.max}`);
 if(filter.stock==='true')clauses.push(Prisma.sql`(p.stock>0 OR EXISTS (SELECT 1 FROM "Variant" v WHERE v."productId"=p.id AND v.active=true AND v.stock>0))`);
 if(filter.project)clauses.push(Prisma.sql`${filter.project}=ANY(p."projectTags")`);
 const where=Prisma.join(clauses,' AND '),sort=filter.sort==='price-up'?Prisma.sql`${effectivePrice} ASC,p.id ASC`:filter.sort==='price-down'?Prisma.sql`${effectivePrice} DESC,p.id ASC`:filter.sort==='name'?Prisma.sql`p.name ASC,p.id ASC`:filter.sort==='featured'?Prisma.sql`p.featured DESC,p."createdAt" DESC,p.id ASC`:Prisma.sql`p."createdAt" DESC,p.id ASC`;
 const [count,ids]=await Promise.all([db.$queryRaw<{count:bigint}[]>(Prisma.sql`SELECT COUNT(*)::bigint AS count FROM "Product" p WHERE ${where}`),db.$queryRaw<{id:string}[]>(Prisma.sql`SELECT p.id FROM "Product" p WHERE ${where} ORDER BY ${sort} LIMIT ${pageSize} OFFSET ${(page-1)*pageSize}`)]);
 const products=await db.product.findMany({where:{id:{in:ids.map(i=>i.id)}},include:{variants:{where:{active:true}}}}),rank=new Map(ids.map((i,n)=>[i.id,n]));products.sort((a,b)=>rank.get(a.id)!-rank.get(b.id)!);
 const total=Number(count[0].count);
 let facets:{brands:string[];voltages:string[];interfaces:string[];maxPrice:number}|undefined;
 if(params.get('facets')==='true'){const rows=await db.$queryRaw<{brands:string[]|null;voltages:string[]|null;interfaces:string[]|null;maxPrice:number|null}[]>`SELECT array_agg(DISTINCT p.brand ORDER BY p.brand) AS brands, array_agg(DISTINCT p.voltage ORDER BY p.voltage) AS voltages, array_agg(DISTINCT p.interface ORDER BY p.interface) AS interfaces, MAX(GREATEST(p.price,COALESCE(v.max_price,p.price)))::int AS "maxPrice" FROM "Product" p LEFT JOIN (SELECT "productId",MAX(price) AS max_price FROM "Variant" WHERE active=true GROUP BY "productId") v ON v."productId"=p.id WHERE p.active=true`;const row=rows[0];facets={brands:row.brands||[],voltages:row.voltages||[],interfaces:row.interfaces||[],maxPrice:row.maxPrice||0};}
 return {products,categories,page,pageSize,total,hasMore:page*pageSize<total,...(facets?{facets}:{})};
}
export async function productBatch(ids:string[]){return db.product.findMany({where:{active:true,id:{in:ids.slice(0,100)}},include:{variants:{where:{active:true}}}});}
