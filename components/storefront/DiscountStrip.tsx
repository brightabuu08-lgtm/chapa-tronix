'use client';
import Image from 'next/image';
import {ChevronRight,Percent} from 'lucide-react';
import {money,type Product} from '@/lib/catalog';
import {displayOffer,discountPercent} from '@/lib/pricing';
import {Link,useShop} from '../Store';
export default function DiscountStrip({products}:{products:Product[]}){
 const {t}=useShop();
 const offers=products.map(product=>({product,offer:displayOffer(product)})).filter(({offer})=>discountPercent(offer.price,offer.oldPrice)>0).slice(0,6);
 if(!offers.length)return null;
 const max=Math.max(...offers.map(({offer})=>discountPercent(offer.price,offer.oldPrice)));
 return <section className="container discount-strip" aria-labelledby="discount-strip-title"><div className="discount-strip-intro"><span className="discount-strip-mark" aria-hidden="true"><Percent size={22}/></span><div><span className="discount-strip-kicker">{t('PUNGUZO DUKANI','STORE OFFERS')}</span><h2 id="discount-strip-title">{t('Hadi','Up to')} {max}%</h2><Link to="/shop">{t('Gundua bidhaa','Explore parts')}<ChevronRight size={12}/></Link></div></div><div className="discount-strip-items">{offers.map(({product,offer})=><Link className="discount-strip-item" to={'/product/'+product.slug} key={product.id}><div className="discount-strip-photo">{product.images[0]&&<Image src={product.images[0]} alt="" width={88} height={88} sizes="72px"/>}<span>-{discountPercent(offer.price,offer.oldPrice)}%</span></div><div className="discount-strip-copy"><h3>{product.name}</h3><div className="discount-strip-prices"><strong>{money(offer.price)}</strong><del>{money(offer.oldPrice!)}</del></div><small>{t('Okoa','Save')} {money(offer.oldPrice!-offer.price)}</small></div><ChevronRight className="discount-strip-arrow" size={16} aria-hidden="true"/></Link>)}</div></section>;
}
