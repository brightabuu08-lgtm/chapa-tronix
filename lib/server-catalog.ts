import {cache} from 'react';
import {db} from './db';
import {products,type Product} from './catalog';
import {catalogPage} from './catalog-query';
function asProduct(p:any):Product{return {...p,oldPrice:p.oldPrice??undefined,datasheet:p.datasheet??undefined,specs:p.specs as Record<string,string>};}
export const readProduct=cache(async(slug:string):Promise<Product|undefined>=>{if(!process.env.DATABASE_URL)return products.find(p=>p.slug===slug);const p=await db.product.findFirst({where:{slug,active:true},include:{variants:{where:{active:true}}}});return p?asProduct(p):undefined;});
export const readCatalog=cache(async():Promise<Product[]>=>{if(!process.env.DATABASE_URL)return products;try{return (await catalogPage(new URL('http://internal/catalog?pageSize=24'))).products.map(asProduct);}catch{console.error('catalog_database_unavailable');return [];}});
