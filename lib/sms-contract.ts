import {z} from 'zod';

export const smsProviders=['beem','custom','mock'] as const;
export type SmsProvider=typeof smsProviders[number];
export const smsStatuses=['QUEUED','SENDING','ACCEPTED','DELIVERED','UNCERTAIN','FAILED','CANCELLED'] as const;
export const orderSmsStatuses=['PENDING','PACKED','SHIPPED','DELIVERED','CANCELLED','PAID','REFUNDED'] as const;
export const smsSettingsSchema=z.object({orderNotifications:z.boolean(),language:z.enum(['sw','en']),statuses:z.array(z.enum(orderSmsStatuses)).max(7)}).strict();
export type SmsSettings=z.infer<typeof smsSettingsSchema>;
export const defaultSmsSettings:SmsSettings={orderNotifications:false,language:'sw',statuses:['PACKED','SHIPPED','DELIVERED']};
export function smsPhone(value:string){const phone=value.replace(/[\s()-]/g,'').replace(/^\+/, '').replace(/^0/,'255');if(!/^255[67]\d{8}$/.test(phone))throw new Error('Namba ya simu si sahihi / Invalid Tanzania mobile number.');return phone;}
const gsm=new Set(Array.from('@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'));
const extended=new Set(Array.from('\f^{}\\[~]|€'));
export function smsSize(text:string){let units=0,unicode=false;for(const char of text){if(gsm.has(char))units++;else if(extended.has(char))units+=2;else{unicode=true;break;}}if(unicode)units=text.length;const single=unicode?70:160,multipart=unicode?67:153;return {encoding:unicode?'UCS2':'GSM7',units,segments:units?units<=single?1:Math.ceil(units/multipart):0};}
export const smsTextSchema=z.string().trim().min(1).max(480).refine(v=>!/[\u0000-\u0008\u000b\u000e-\u001f\u007f]/.test(v),'Unsupported control characters.').refine(v=>smsSize(v).segments<=3,'SMS is limited to three segments.');
export const smsComposeSchema=z.object({requestId:z.uuid(),recipient:z.string().max(40).refine(v=>{try{smsPhone(v);return true;}catch{return false;}},'Invalid Tanzania mobile number.').transform(smsPhone),text:smsTextSchema,acknowledge:z.literal(true)}).strict();
export const smsReceiptSchema=z.object({eventId:z.string().min(1).max(150),clientReference:z.string().min(1).max(100),messageId:z.string().min(1).max(150),status:z.enum(['ACCEPTED','DELIVERED','UNDELIVERABLE'])}).strict();
export type SmsReceipt=z.infer<typeof smsReceiptSchema>;
export function smsTemplate(status:string,order:{number:string;delivery?:string},language:'sw'|'en'='sw'){
 const reference=order.number.replace(/[^A-Za-z0-9-]/g,'').slice(0,65);
 const sw:Record<string,string>={PENDING:`Oda ${reference} imepokelewa. Tutawasiliana nawe kuithibitisha. Huu si uthibitisho wa malipo.`,PACKED:order.delivery==='pickup'?`Oda ${reference} iko tayari kuchukuliwa. Wasiliana na duka kupanga muda wa kuichukua.`:`Oda ${reference} imeandaliwa. Tutawasiliana nawe kupanga kukufikishia.`,SHIPPED:`Oda ${reference} imetumwa. Angalia taarifa za ufuatiliaji kwenye website au wasiliana na duka.`,DELIVERED:`Oda ${reference} imerekodiwa kuwa imekabidhiwa. Asante kwa kununua kwetu.`,CANCELLED:`Oda ${reference} imefutwa. Kama unahitaji msaada, wasiliana na duka.`,PAID:`Malipo ya oda ${reference} yamethibitishwa. Asante.`,REFUNDED:`Marejesho ya malipo ya oda ${reference} yamethibitishwa.`};
 const en:Record<string,string>={PENDING:`Order ${reference} received. We will contact you to confirm it. This is not payment confirmation.`,PACKED:order.delivery==='pickup'?`Order ${reference} is ready for pickup. Contact the store to arrange collection.`:`Order ${reference} is packed. We will contact you to arrange delivery.`,SHIPPED:`Order ${reference} has been dispatched. Check tracking on our website or contact the store.`,DELIVERED:`Order ${reference} is recorded as delivered. Thank you for shopping with us.`,CANCELLED:`Order ${reference} has been cancelled. Contact the store if you need assistance.`,PAID:`Payment for order ${reference} has been confirmed. Thank you.`,REFUNDED:`The payment refund for order ${reference} has been confirmed.`};
 const text=(language==='sw'?sw:en)[status];return text?'Chapa Tronix: '+text:null;
}
