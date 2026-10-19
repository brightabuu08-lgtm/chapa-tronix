import {db} from './db';
import {pagination} from './catalog-query';
export const pagedAdminSections=['products','orders','customers','reviews','quotes','ideas','emails','logs','coupons'] as const;
export async function adminPage(section:string,url:URL){
 const {page,pageSize}=pagination(url),skip=(page-1)*pageSize,take=pageSize,orderBy=[{createdAt:'desc' as const},{id:'asc' as const}];
 let rows:unknown[]=[],total=0;
 switch(section){
 case 'products':{const visibility=url.searchParams.get('visibility'),where=visibility==='active'?{active:true}:visibility==='archived'?{active:false}:{};[rows,total]=await Promise.all([db.product.findMany({where,skip,take,orderBy,include:{variants:true}}),db.product.count({where})]);break;}
 case 'orders':[rows,total]=await Promise.all([db.order.findMany({skip,take,orderBy,include:{items:true,payments:true,refunds:true}}),db.order.count()]);break;
 case 'customers':[rows,total]=await Promise.all([db.user.findMany({skip,take,orderBy,select:{id:true,name:true,email:true,phone:true,role:true,createdAt:true,_count:{select:{orders:true}}}}),db.user.count()]);break;
 case 'reviews':[rows,total]=await Promise.all([db.review.findMany({skip,take,orderBy,include:{user:{select:{name:true}},product:{select:{name:true}}}}),db.review.count()]);break;
 case 'quotes':[rows,total]=await Promise.all([db.quote.findMany({skip,take,orderBy}),db.quote.count()]);break;
 case 'ideas':[rows,total]=await Promise.all([db.ideaSubmission.findMany({skip,take,orderBy}),db.ideaSubmission.count()]);break;
 case 'emails':[rows,total]=await Promise.all([db.emailJob.findMany({skip,take,orderBy,select:{id:true,recipient:true,subject:true,status:true,attempts:true,createdAt:true,sentAt:true,lastError:true}}),db.emailJob.count()]);break;
 case 'logs':[rows,total]=await Promise.all([db.auditLog.findMany({skip,take,orderBy}),db.auditLog.count()]);break;
 case 'coupons':[rows,total]=await Promise.all([db.coupon.findMany({skip,take,orderBy:{code:'asc'}}),db.coupon.count()]);break;
 default:throw new Error('Unknown admin page');
 }
 return {items:rows,total,page,pageSize,hasMore:page*pageSize<total};
}
