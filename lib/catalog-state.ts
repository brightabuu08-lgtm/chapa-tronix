import type {Product} from './catalog';
export function mergeCatalog(current:Product[],incoming:Product[]){const ids=new Set(incoming.map(p=>p.id));return [...incoming,...current.filter(p=>!ids.has(p.id))];}
