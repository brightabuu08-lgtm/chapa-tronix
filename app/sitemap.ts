import type {MetadataRoute} from 'next';
import {db} from '@/lib/db';
import {products as fallbackProducts,categories as fallbackCategories,guides} from '@/lib/catalog';
export const dynamic='force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const base=(process.env.PUBLIC_SITE_URL||process.env.APP_URL||process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000').replace(/\/$/,'');
 const [products,categories]=process.env.DATABASE_URL?await Promise.all([db.product.findMany({where:{active:true},select:{slug:true}}),db.category.findMany({where:{active:true},select:{id:true}})]):[fallbackProducts.map(p=>({slug:p.slug})),fallbackCategories];
 return [
  ...['','/shop','/learn','/about','/contact','/faq','/privacy','/terms','/returns','/shipping'].map(path=>({url:base+path,changeFrequency:'weekly' as const,priority:path===''?1:.5})),
  ...products.map(p=>({url:base+'/product/'+encodeURIComponent(p.slug),changeFrequency:'weekly' as const,priority:.8})),
  ...categories.map(c=>({url:base+'/category/'+encodeURIComponent(c.id),changeFrequency:'weekly' as const,priority:.6})),
  ...guides.map(g=>({url:base+'/learn/'+g.slug,changeFrequency:'monthly' as const,priority:.5}))
 ];
}
