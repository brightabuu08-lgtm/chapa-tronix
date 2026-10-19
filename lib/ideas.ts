import {z} from 'zod';
import {phoneSchema,normalizePhone} from './commerce';

export const ideaSchema=z.object({
  name:z.string().trim().min(2).max(100),
  email:z.email().max(254).transform(v=>v.toLowerCase()),
  phone:phoneSchema.transform(normalizePhone),
  region:z.string().trim().min(2).max(80),
  title:z.string().trim().min(5).max(160),
  stage:z.enum(['idea','prototype','working']),
  problem:z.string().trim().min(20).max(3000),
  solution:z.string().trim().min(30).max(5000),
  support:z.string().trim().min(10).max(2000),
  consent:z.literal(true),
});
