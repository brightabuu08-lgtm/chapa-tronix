'use client';
import {useEffect,useState} from 'react';
import {ChevronRight,Heart,ShoppingCart,Truck,MapPin,Headphones,Download,ExternalLink} from 'lucide-react';
import {useShop,Link,ProductCard,Empty,Quantity,AsyncForm,SectionTitle} from '../Store';
import {money} from '@/lib/catalog';
import {discountPercent} from '@/lib/pricing';
import type {ProductDetailResponse} from '@/lib/contracts';
import {uiCopy} from '@/lib/ui-copy';
import ProductGallery from './ProductGallery';
import ProductBundle from './ProductBundle';
import StarRating,{StarRatingInput} from './StarRating';

export default function ProductPage({slug}:{slug:string}){
 const {t,en,catalog,add,go,wishlist,wish,api,notify,user,business,loadProducts,mergeProducts}=useShop();
 const p=catalog.find(p=>p.slug===slug);
 const [qty,setQty]=useState(1),[tab,setTab]=useState('specs'),[reviews,setReviews]=useState<any[]>([]),[variant,setVariant]=useState(''),[variants,setVariants]=useState<any[]>(p?.variants||[]),[frequent,setFrequent]=useState<string[]>([]);
 useEffect(()=>{
  let active=true;
  api('products/'+slug).then((d:ProductDetailResponse)=>{
   if(!active)return;
   setReviews(d.reviews||[]);setVariants(d.variants||[]);
   if(!p?.stock){const available=d.variants?.find(v=>v.stock>0);if(available)setVariant(available.id);}
   setFrequent(d.frequentlyBoughtIds||[]);mergeProducts([d]);
   loadProducts([...(d.frequentlyBoughtIds||[]),...(d.relatedIds||[])]).catch(()=>{});
  }).catch(()=>{});
  return()=>{active=false;};
 },[slug]);
 if(!p)return <section className="container page"><Empty title={t('Bidhaa haijapatikana','Product not found')} text={t('Angalia orodha ya bidhaa zinazopatikana dukani.','Browse the catalog for available parts.')}/></section>;
 const selected=variants.find(v=>v.id===variant),price=selected?.price??p.price,oldPrice=selected?selected.oldPrice:p.oldPrice,stock=selected?.stock??p.stock;
 const reviewCount=p.reviewCount??reviews.length,rating=p.rating??(reviews.length?reviews.reduce((sum,r)=>sum+r.rating,0)/reviews.length:0);
 const ratingLabel=reviewCount?`${rating.toFixed(1)} ${t('kati ya nyota 5','out of 5 stars')}`:t('Bado hakuna maoni','No reviews yet');
 const tabs=[['specs',t('Sifa za kiufundi','Specifications')],['compatibility',t('Vifaa vinavyoendana','Compatibility')],['reviews',t('Maoni','Reviews')+' ('+reviewCount+')']];
 const related=p.relatedIds?.length?catalog.filter(x=>p.relatedIds!.includes(x.id)):catalog.filter(x=>x.id!==p.id&&x.categoryId===p.categoryId);
 return <section className="container page product-page">
  <nav className="breadcrumbs" aria-label={t('Ulipofika','Breadcrumb')}><Link to="/">{t('Mwanzo','Home')}</Link><ChevronRight size={12}/><Link to="/shop">{t('Bidhaa','Products')}</Link><ChevronRight size={12}/><span>{p.name}</span></nav>
  <div className="product-detail">
   <ProductGallery images={p.images} name={p.name}/>
   <div className="detail-copy">
    <div className="product-meta"><span className="eyebrow">{p.brand}</span><span className={'stock'+(!stock?' unavailable':'')}><span/>{stock?t('Ipo dukani','In stock'):t('Imeisha kwa sasa','Out of stock')}</span></div>
    <h1>{p.name}</h1>
    <button type="button" className="product-review-link" onClick={()=>{setTab('reviews');document.getElementById('product-details')?.scrollIntoView({behavior:'smooth',block:'start'});}}><StarRating value={reviewCount?rating:0} label={ratingLabel}/><span>{reviewCount?`${rating.toFixed(1)} · ${reviewCount} ${t('maoni','reviews')}`:t('Bado hakuna maoni','No reviews yet')}</span></button>
    <div className="detail-price"><b>{money(price)}</b>{oldPrice>price&&<><del>{money(oldPrice)}</del><span className="product-savings">−{discountPercent(price,oldPrice)}%</span></>}{business.usdRate&&<small className="usd-estimate">≈ USD {(price/business.usdRate).toFixed(2)}</small>}</div>
    <p className="product-description">{en?p.descriptionEn:p.description}</p>
    <dl className="product-key-specs">{Object.entries(p.specs).slice(0,3).map(([key,value])=><div key={key}><dt>{uiCopy(key,en)}</dt><dd>{value}</dd></div>)}</dl>
   </div><aside className="purchase-panel"><div className="purchase-heading"><span>{t('Tayari kwa mradi wako?','Ready for your build?')}</span><b>{money(price)}</b></div>
    {variants.length>0&&<label className="product-variant">{t('Chagua aina','Choose variant')}<select value={variant} onChange={e=>{setVariant(e.target.value);setQty(1);}}><option value="">{t('Ya kawaida','Standard')}</option>{variants.map(v=><option key={v.id} value={v.id}>{v.name} · {money(v.price)}</option>)}</select></label>}
    <div className="buy-row"><Quantity n={qty} max={stock} onChange={setQty}/><button className="button orange" onClick={()=>add(p.id,qty,variant||undefined)} disabled={!stock}><ShoppingCart size={16}/>{t('Weka kikapuni','Add to cart')}</button><button className="button secondary product-save" onClick={()=>wish(p.id)} aria-pressed={wishlist.includes(p.id)} aria-label={t('Hifadhi bidhaa','Save product')}><Heart fill={wishlist.includes(p.id)?'currentColor':'none'} size={18}/></button></div>
    <button type="button" className="button purchase-now" disabled={!stock} onClick={()=>{add(p.id,qty,variant||undefined);go('/cart');}}>{t('Nunua sasa','Buy now')}<ChevronRight size={16}/></button>
    <p className="product-shipping-note">{t('Gharama ya usafirishaji itaonyeshwa kabla ya kuthibitisha oda.','Shipping calculated at checkout.')}</p>
    <div className="detail-benefits"><span><Truck size={16}/>{t('Dar es Salaam na mikoani','Dar es Salaam & nationwide')}</span><span><MapPin size={16}/>{t('Chukua Kigamboni bila gharama ya usafirishaji','Free pickup in Kigamboni')}</span><Link to="/chat"><Headphones size={16}/>{t('Uliza kuhusu bidhaa hii','Ask about this product')}</Link></div>
    <div className="product-reference"><span>SKU: {p.sku}</span>{p.datasheet&&<a className="datasheet" href={p.datasheet} target="_blank" rel="noreferrer"><Download size={14}/>{t('Maelezo ya kiufundi (PDF)','Datasheet (PDF)')}<ExternalLink size={12}/></a>}</div>
   </aside>
  </div>
  <section className="product-information" id="product-details">
   <div className="tabs" role="tablist" aria-label={t('Maelezo ya bidhaa','Product details')}>{tabs.map(([id,label])=><button key={id} id={'product-tab-'+id} role="tab" aria-selected={tab===id} aria-controls="product-tab-panel" tabIndex={tab===id?0:-1} className={tab===id?'active':''} onKeyDown={e=>{const ids=tabs.map(([id])=>id);if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?2:(ids.indexOf(tab)+(e.key==='ArrowRight'?1:2))%3;setTab(ids[next]);document.getElementById('product-tab-'+ids[next])?.focus();}}} onClick={()=>setTab(id)}>{label}</button>)}</div>
   <div className="tab-panel" id="product-tab-panel" role="tabpanel" aria-labelledby={'product-tab-'+tab} tabIndex={0}>
    {tab==='specs'?<table className="spec-table"><tbody>{Object.entries(p.specs).map(([key,value])=><tr key={key}><th scope="row">{uiCopy(key,en)}</th><td>{value}</td></tr>)}</tbody></table>:tab==='compatibility'?<><h3>{t('Kabla ya kuunganisha','Before you connect')}</h3><p>{en?(p.compatibilityEn||p.compatibility):p.compatibility}</p></>:<div className="product-reviews">
     <div className="review-summary"><StarRating value={reviewCount?rating:0} label={ratingLabel}/><b>{reviewCount?rating.toFixed(1):t('Bado hakuna maoni','No reviews yet')}</b><span>{reviewCount?t('Maoni yaliyohakikiwa','Approved reviews')+': '+reviewCount:t('Kuwa wa kwanza kutoa maoni.','Be the first to leave a review.')}</span></div>
     <div className="review-list">{reviews.map(r=><article className="review" key={r.id}><div><b>{r.user?.name}</b><StarRating value={r.rating} label={`${r.rating} ${t('kati ya nyota 5','out of 5 stars')}`}/></div><p>{r.text}</p></article>)}</div>
     {user?<AsyncForm className="review-form" onSubmit={async data=>{await api('reviews',{productId:p.id,rating:Number(data.rating),text:data.text});notify(t('Asante! Maoni yanasubiri kuhakikiwa.','Thank you. Your review is awaiting moderation.'));}}><h3>{t('Maoni yako','Your review')}</h3><StarRatingInput legend={t('Chagua nyota','Choose your rating')} label={n=>t('Nyota ','Stars ')+n}/><label>{t('Tuambie kuhusu bidhaa','Tell us about the product')}<textarea required name="text" minLength={10} rows={3}/></label><button className="button">{t('Tuma maoni','Submit review')}</button></AsyncForm>:<p className="muted">{t('Maoni huandikwa baada ya ununuzi uliothibitishwa.','Reviews are available after a verified purchase.')}</p>}
    </div>}
   </div>
  </section>
  <ProductBundle product={p} variantId={variant||undefined} recommendations={frequent.length?frequent:p.relatedIds||[]} frequent={frequent.length>0}/>
  {related.length>0&&<div className="section product-related"><SectionTitle title={t('Bidhaa zinazohusiana','Related products')}/><div className="product-grid">{related.slice(0,4).map(x=><ProductCard key={x.id} p={x}/>)}</div></div>}
 </section>;
}
