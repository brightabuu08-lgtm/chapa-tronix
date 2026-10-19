import {z} from 'zod';
import {db} from '../db';
import {HttpError,rateLimit,readBody} from '../auth';
import {pagination} from '../catalog-query';
import {smsConfiguration} from '../sms-provider';
import {composeSms,saveSmsSettings,smsAction,smsSettings} from '../sms';
import {orderSmsStatuses,smsComposeSchema,smsStatuses,smsTemplate} from '../sms-contract';
import {json} from './response';
export async function handleSmsAdmin(request:Request,id:string|undefined,actor:{id:string;role:string}){
 if(actor.role!=='ADMIN')throw new HttpError(403,'Admin permission required.');
 if(request.method==='GET'){
  const url=new URL(request.url),{page,pageSize}=pagination(url),status=url.searchParams.get('status');
  const where=status?{status:z.enum(smsStatuses).parse(status)}:{};
  const [items,total,settings,counts,heartbeat]=await Promise.all([
   db.smsJob.findMany({where,orderBy:[{createdAt:'desc'},{id:'asc'}],skip:(page-1)*pageSize,take:pageSize,select:{id:true,recipient:true,sender:true,text:true,provider:true,status:true,attempts:true,segments:true,encoding:true,providerMessageId:true,lastError:true,createdAt:true,expiresAt:true,acceptedAt:true,deliveredAt:true,orderId:true,events:{select:{status:true,createdAt:true},orderBy:{createdAt:'desc'},take:5}}}),
   db.smsJob.count({where}),smsSettings(),db.smsJob.groupBy({by:['status'],_count:{_all:true}}),db.workerHeartbeat.findUnique({where:{id:'maintenance'}})
  ]);
  return json({items,total,page,pageSize,hasMore:page*pageSize<total,settings,configuration:smsConfiguration(),counts:Object.fromEntries(counts.map(v=>[v.status,v._count._all])),workerHealthy:!!heartbeat&&Date.now()-heartbeat.lastSuccessAt.getTime()<120000,templates:orderSmsStatuses.map(status=>({status,sw:smsTemplate(status,{number:'CT-MFANO',delivery:'pickup'},'sw'),en:smsTemplate(status,{number:'CT-SAMPLE',delivery:'pickup'},'en')}))});
 }
 if(request.method==='POST'&&!id){const value=smsComposeSchema.parse(await readBody(request));await rateLimit('sms-compose:'+actor.id,10,60000);const previous=await db.smsJob.findUnique({where:{dedupeKey:'manual:'+actor.id+':'+value.requestId},select:{id:true}});if(!previous)await rateLimit('sms-recipient:'+actor.id+':'+value.recipient,3,900000);const job=await composeSms(value,actor.id);return json({id:job.id,status:job.status},201);}
 if(request.method==='PATCH'&&id==='settings'){await rateLimit('sms-settings:'+actor.id,20,60000);return json(await saveSmsSettings(await readBody(request),actor.id));}
 if(request.method==='PATCH'&&id){await rateLimit('sms-action:'+actor.id,20,60000);const {action}=z.object({action:z.enum(['retry','cancel'])}).strict().parse(await readBody(request));return json(await smsAction(id,action,actor.id));}
 throw new HttpError(404,'Route not found.');
}
