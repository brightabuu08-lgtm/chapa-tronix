import {z} from 'zod';
import {isLocalProductImage} from './product-images';
export const productSchema=z.object({
 id:z.string().regex(/^[a-z0-9-]+$/).max(80),slug:z.string().regex(/^[a-z0-9-]+$/).max(100),name:z.string().trim().min(2).max(160),sku:z.string().trim().min(2).max(80),
 description:z.string().trim().min(10).max(5000),descriptionEn:z.string().trim().min(10).max(5000),price:z.number().int().min(1).max(100000000),oldPrice:z.number().int().positive().max(100000000).nullable().optional(),
 stock:z.number().int().min(0).max(100000),categoryId:z.string().min(1),brand:z.string().trim().min(1).max(80),voltage:z.string().max(100),interface:z.string().max(100),
 images:z.array(z.string().max(1000).refine(v=>/^\/images\/[\w.-]+$/.test(v)||isLocalProductImage(v)||!!process.env.S3_PUBLIC_URL&&v.startsWith(process.env.S3_PUBLIC_URL.replace(/\/+$/,'')+'/'))).min(1).max(8),
 specs:z.record(z.string().min(1).max(100),z.string().max(500)),compatibility:z.string().max(3000),compatibilityEn:z.string().max(3000).nullable().optional(),datasheet:z.string().max(1000).url().refine(v=>v.startsWith('https://')).nullable().optional(),
 featured:z.boolean().default(false),active:z.boolean().default(true),relatedIds:z.array(z.string().max(80)).max(8).default([]),projectTags:z.array(z.enum(['robot','home','cnc'])).max(3).default([])
}).refine(p=>!p.oldPrice||p.oldPrice>p.price,{path:['oldPrice'],message:'The regular price must be higher than the sale price.'});
export const variantSchema=z.object({productId:z.string().max(80),name:z.string().trim().min(1).max(100),sku:z.string().min(1).max(80),price:z.number().int().positive().max(100000000),oldPrice:z.number().int().positive().max(100000000).nullable().optional(),stock:z.number().int().min(0).max(100000),active:z.boolean().default(true)}).refine(v=>!v.oldPrice||v.oldPrice>v.price,{path:['oldPrice'],message:'Regular price must exceed the sale price.'});
