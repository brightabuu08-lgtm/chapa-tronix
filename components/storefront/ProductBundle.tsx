'use client';
import {useState} from 'react';
import {useShop,Link} from '../Store';
import {money,type Product} from '@/lib/catalog';
export default function ProductBundle({product,variantId,recommendations,frequent=false}:{product:Product;variantId?:string;recommendations:string[];frequent?:boolean}){
 const {t,catalog,add}=useShop(),[selected,setSelected]=useState<string[]>([]);
 const items=recommendations.map(id=>catalog.find(p=>p.id===id)).filter((p):p is Product=>!!p&&p.id!==product.id&&!p.variants?.length).slice(0,3);
 if(!items.length)return null;const main=product.variants?.find(v=>v.id===variantId)||product;const total=main.price+items.filter(p=>selected.includes(p.id)).reduce((sum,p)=>sum+p.price,0);
 return <section className="product-bundle"><h2>{frequent?t('Mara nyingi hununuliwa pamoja','Frequently bought together'):t('Vifaa vya kuongezea','Add to your project')}</h2><p>{t('Chagua vifaa unavyohitaji. Hakiki ulinganifu kabla ya kununua.','Select the parts you need. Check compatibility before buying.')}</p>{items.map(p=><label className="bundle-item" key={p.id}><input type="checkbox" checked={selected.includes(p.id)} disabled={!p.stock} onChange={e=>setSelected(e.target.checked?[...selected,p.id]:selected.filter(id=>id!==p.id))}/><Link to={'/product/'+p.slug}>{p.name}</Link><strong>{money(p.price)}</strong></label>)}<div className="bundle-total"><span>{t('Jumla pamoja na bidhaa hii','Total including this product')}: <b>{money(total)}</b></span><button className="button" disabled={!main.stock} onClick={()=>{add(product.id,1,variantId);for(const p of items.filter(p=>selected.includes(p.id)))add(p.id);}}>{t('Weka chaguo kwenye kikapu','Add selected items to cart')}</button></div></section>;
}
