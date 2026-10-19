import {HttpError} from './auth';
export function assertSellingMode(business:{pricesApproved:boolean;deliveryApproved:boolean;policiesApproved:boolean;taxMode?:string;phone?:string;email?:string;codEnabled?:boolean},databaseUrl=process.env.DATABASE_URL||'',mode=process.env.SELLING_MODE||'closed'){
 let testDatabase=false;try{const name=decodeURIComponent(new URL(databaseUrl).pathname.slice(1));testDatabase=name==='test'||name.endsWith('_test');}catch{}
 if(mode==='test'&&testDatabase&&process.env.NODE_ENV!=='production')return;
 // Explicit owner activation accepts pending cash orders without claiming unfinished commercial approvals.
 if(mode==='live'&&process.env.CASH_ORDERS_OPEN==='true'&&process.env.CASH_ONLY==='true'&&business.codEnabled===true)return;
 if(mode==='live'&&!['INCLUSIVE','EXCLUSIVE','EXEMPT'].includes(business.taxMode||''))throw new HttpError(503,'Commercial tax treatment requires owner approval.');
 if(mode==='live'&&(!business.email||!/^\+?[0-9]{7,15}$/.test((business.phone||'').replace(/[\s()-]/g,''))))throw new HttpError(503,'Configure official support email and phone before opening orders.');
 if(mode!=='live'||!business.pricesApproved||!business.deliveryApproved||!business.policiesApproved)throw new HttpError(503,'Oda halisi bado hazijafunguliwa / Orders are not open yet.');
}
