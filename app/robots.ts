import type {MetadataRoute} from 'next';
export const dynamic='force-dynamic';
export default function robots():MetadataRoute.Robots{
 const base=(process.env.PUBLIC_SITE_URL||process.env.APP_URL||process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000').replace(/\/$/,'');
 const privatePaths=['/api/','/admin','/account','/cart','/checkout','/track-order','/chat','/wishlist','/reset-password','/verify-email'];
 return {rules:{userAgent:'*',...(process.env.SELLING_MODE==='live'?{allow:'/'}:{}),disallow:process.env.SELLING_MODE==='live'?privatePaths:['/',...privatePaths]},sitemap:base+'/sitemap.xml'};
}
