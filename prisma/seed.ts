import {PrismaClient} from '../generated/prisma-v6';
import {hash} from 'bcryptjs';
import {categories,products} from '../lib/catalog';
const db=new PrismaClient();
async function main(){for(const c of categories)await db.category.upsert({where:{id:c.id},update:{},create:{id:c.id,name:c.name,nameEn:c.nameEn}});for(const p of products){const {variants,rating,reviewCount,createdAt,...record}=p;await db.product.upsert({where:{id:p.id},update:{},create:record});}if(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD){if(process.env.ADMIN_PASSWORD.length<12)throw new Error('ADMIN_PASSWORD must be at least 12 characters');await db.user.upsert({where:{email:process.env.ADMIN_EMAIL.toLowerCase()},update:{},create:{email:process.env.ADMIN_EMAIL.toLowerCase(),name:'Store administrator',passwordHash:await hash(process.env.ADMIN_PASSWORD,12),role:'ADMIN'}});}console.log('Catalog seeded. Existing stock and administrator credentials were preserved.');}
main().finally(()=>db.$disconnect());
