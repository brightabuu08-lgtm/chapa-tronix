'use client';
import {useEffect,useRef,useState} from 'react';
import Image from 'next/image';
import {X,ZoomIn,ChevronLeft,ChevronRight} from 'lucide-react';
import {useShop} from '../Store';
export default function ProductGallery({images,name}:{images:string[];name:string}){
 const {t}=useShop();const [index,setIndex]=useState(0),[open,setOpen]=useState(false);const overlay=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const change=(delta:number)=>setIndex(value=>(value+delta+images.length)%images.length);
 useEffect(()=>{if(!open)return;const old=document.body.style.overflow;document.body.style.overflow='hidden';overlay.current?.querySelector<HTMLButtonElement>('button')?.focus();
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();setOpen(false)}if(e.key==='ArrowLeft')change(-1);if(e.key==='ArrowRight')change(1);if(e.key==='Tab'){const controls=Array.from(overlay.current?.querySelectorAll<HTMLElement>('button')||[]);const first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};document.addEventListener('keydown',key);return()=>{document.body.style.overflow=old;document.removeEventListener('keydown',key);trigger.current?.focus();};
 },[open,images.length]);
 return <div className="product-gallery"><button ref={trigger} className="detail-photo" onClick={()=>setOpen(true)} aria-label={t('Kuza picha','Zoom image')}><Image src={images[index]||images[0]} alt={name} width={970} height={728} priority sizes="(max-width: 767px) 100vw, 50vw"/><span><ZoomIn size={18}/>{t('Kuza picha','Zoom')}</span></button><div className="image-thumbnails">{images.map((src,i)=><button key={src+i} aria-label={t('Onyesha picha ','Show image ')+(i+1)} aria-pressed={index===i} onClick={()=>setIndex(i)}><Image src={src} alt="" width={90} height={70}/></button>)}</div>
 {open&&<div ref={overlay} className="gallery-overlay" role="dialog" aria-modal="true" aria-label={t('Picha za ','Images of ')+name} onClick={e=>{if(e.target===e.currentTarget)setOpen(false)}}><button className="gallery-close" aria-label={t('Funga picha','Close image')} onClick={()=>setOpen(false)}><X/></button>{images.length>1&&<button className="gallery-prev" onClick={()=>change(-1)} aria-label={t('Picha iliyotangulia','Previous image')}><ChevronLeft/></button>}<Image src={images[index]||images[0]} alt={name} width={1600} height={1200} sizes="95vw"/>{images.length>1&&<button className="gallery-next" onClick={()=>change(1)} aria-label={t('Picha inayofuata','Next image')}><ChevronRight/></button>}<span className="gallery-counter">{index+1} / {images.length}</span></div>}
 </div>;
}
