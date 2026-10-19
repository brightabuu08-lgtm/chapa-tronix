'use client';
import {useEffect,useRef} from 'react';
import Image from 'next/image';
import {Cpu,Radio,Cog,Zap,Wrench,Bot,Factory,Layers} from 'lucide-react';
import {Link,useShop} from '../Store';
const icons=[Cpu,Radio,Cog,Zap,Wrench,Bot,Factory,Layers];

export default function CategoryCarousel(){
 const {t,en,catalog,shopCategories}=useShop();
 const row=useRef<HTMLDivElement>(null),held=useRef(false),hovered=useRef(false);
 useEffect(()=>{
  const node=row.current;if(!node)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,last=0,direction=1,visible=false,position=node.scrollLeft;
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;});observer.observe(node);
  const tick=(now:number)=>{
   const elapsed=last?Math.min(now-last,50):0;last=now;
   const max=node.scrollWidth-node.clientWidth;
   if(!held.current&&!hovered.current&&!reduced.matches&&visible&&!document.hidden&&!node.querySelector('a:focus-visible')&&max>1){
    if(position>=max-1)direction=-1;
    else if(position<=0)direction=1;
    position=Math.max(0,Math.min(max,position+direction*elapsed*.025));node.scrollLeft=position;
   }else position=node.scrollLeft;
   frame=requestAnimationFrame(tick);
  };
  const release=()=>{held.current=false;};
  window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);window.addEventListener('blur',release);
  frame=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);window.removeEventListener('blur',release);};
 },[shopCategories.length]);
 return <section className="container category-carousel" aria-label={t('Makundi ya bidhaa','Product categories')}>
  <div ref={row} className="discovery-categories" onPointerDown={()=>{held.current=true;}} onPointerEnter={event=>{if(event.pointerType==='mouse')hovered.current=true;}} onPointerLeave={()=>{hovered.current=false;}}>
   {shopCategories.map((c,i)=>{const Icon=icons[i%icons.length],product=catalog.find(p=>p.categoryId===c.id);return <Link to={'/category/'+c.id} key={c.id}><span>{product?<Image src={product.images[0]} alt="" width={240} height={180} sizes="(max-width:650px) 112px, 196px"/>:<Icon size={36}/>}</span><b>{en?c.nameEn:c.name}</b></Link>})}
  </div>
 </section>;
}
