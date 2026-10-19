import {db} from './db';
import {businessSchema,defaultBusiness,type BusinessSettings} from './business-config';
export {businessSchema,defaultBusiness,shippingCost} from './business-config';
export type {BusinessSettings} from './business-config';
export async function businessSettings():Promise<BusinessSettings>{
 const record=await db.storeSettings.findUnique({where:{id:'business'}});const parsed=businessSchema.safeParse(record?.data||{});return parsed.success?parsed.data:defaultBusiness;
}
