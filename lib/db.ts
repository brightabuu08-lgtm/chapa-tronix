import {PrismaClient} from '../generated/prisma-v6';
const globalDb=globalThis as unknown as {prisma?:PrismaClient;revision?:string};
export const db=globalDb.revision==='store-v6'?globalDb.prisma??new PrismaClient():new PrismaClient();
if(process.env.NODE_ENV!=='production'){globalDb.prisma=db;globalDb.revision='store-v6';}
