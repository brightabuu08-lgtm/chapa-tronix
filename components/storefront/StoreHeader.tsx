'use client';
import {useRef,useState,useEffect} from 'react';
import {Search,Menu,PanelLeftClose,ShoppingCart,Heart,User,ChevronDown,Zap,Home,Package,BookOpen,FileText,Headphones} from 'lucide-react';
import {displayPrice} from '@/lib/pricing';
import {categoryMatches} from '@/lib/category-tree';
import {money,type Product} from '@/lib/catalog';
import {Link,useShop} from '../Store';

export default function StoreHeader({route}:{route:string}){
 const {t,en,go,catalog,cart,user,shopCategories,api,preview}=useShop();
 const [query,setQuery]=useState(''),[category,setCategory]=useState('');
 useEffect(()=>setQuery(''),[route]);
 const drawer=useRef<HTMLDetailsElement>(null);
 useEffect(()=>{const node=drawer.current;if(!node)return;let oldOverflow='';const toggle=()=>{if(node.open){oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';}else document.body.style.overflow=oldOverflow;};const trap=(event:KeyboardEvent)=>{if(!node.open||event.key!=='Tab')return;const links=Array.from(node.querySelectorAll<HTMLElement>('summary,a,button')).filter(el=>el.getClientRects().length);const first=links[0],last=links.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}else if(!node.contains(document.activeElement)){event.preventDefault();first?.focus();}};node.addEventListener('toggle',toggle);document.addEventListener('keydown',trap);return()=>{node.removeEventListener('toggle',toggle);document.removeEventListener('keydown',trap);if(node.open)document.body.style.overflow=oldOverflow;};},[]);
 useEffect(()=>{if(drawer.current)drawer.current.open=false;},[route]);
 useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&drawer.current?.open){drawer.current.open=false;drawer.current.querySelector('summary')?.focus();}};document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);},[]);
 useEffect(()=>{
  let gesture:{id:number;x:number;y:number;closing:boolean}|null=null;
  const start=(e:PointerEvent)=>{
   if(e.pointerType!=='touch'||!e.isPrimary||!matchMedia('(max-width:900px)').matches)return;
   const target=e.target as HTMLElement;
   if(target.closest('input,textarea,select'))return;
   const closing=!!drawer.current?.open;
   if(closing?!!target.closest('.drawer-panel'):!!target.closest('.sidebar-swipe-edge'))gesture={id:e.pointerId,x:e.clientX,y:e.clientY,closing};
  };
  const end=(e:PointerEvent)=>{
   if(!gesture||gesture.id!==e.pointerId)return;
   const {x,y,closing}=gesture;gesture=null;
   const dx=e.clientX-x,dy=e.clientY-y;
   if(!drawer.current||Math.abs(dx)<65||Math.abs(dx)<Math.abs(dy)*1.5)return;
   if(closing&&dx<0)drawer.current.open=false;
   else if(!closing&&dx>0)drawer.current.open=true;
  };
  const cancel=()=>{gesture=null};
  document.addEventListener('pointerdown',start,{passive:true});
  document.addEventListener('pointerup',end,{passive:true});
  document.addEventListener('pointercancel',cancel,{passive:true});
  return()=>{document.removeEventListener('pointerdown',start);document.removeEventListener('pointerup',end);document.removeEventListener('pointercancel',cancel)};
 },[]);
 const selectedCategory=shopCategories.find(c=>c.id===category);
 const searchCategoryLabel=selectedCategory?(en?selectedCategory.nameEn:selectedCategory.name):t('Bidhaa','Products');
 const count=cart.reduce((sum,item)=>sum+item.quantity,0);
 const [suggestions,setSuggestions]=useState<Product[]|null>(null);
 useEffect(()=>{if(preview||query.length<2){setSuggestions(null);return;}let active=true;const timer=setTimeout(()=>{api('catalog?'+new URLSearchParams({q:query,category,page:'1',pageSize:'5'})).then(d=>{if(active)setSuggestions(d.products)}).catch(()=>{if(active)setSuggestions([])});},250);return()=>{active=false;clearTimeout(timer)};},[query,category,preview]);
 const matches=suggestions||catalog.filter(p=>[p.name,p.sku,...Object.values(p.specs)].join(' ').toLowerCase().includes(query.toLowerCase())&&(!category||categoryMatches(p.categoryId,category,shopCategories))).slice(0,5);
 function search(){go('/shop?'+new URLSearchParams({...(query?{q:query}:{}),...(category?{category}: {})}));setQuery('')}
 const nav=[{to:'/',label:t('Mwanzo','Home'),Icon:Home},{to:'/shop',label:t('Bidhaa','Products'),Icon:Package},{to:'/wishlist',label:t('Zilizohifadhiwa','Saved products'),Icon:Heart},{to:'/learn',label:t('Mafunzo','Learning hub'),Icon:BookOpen},{to:'/quote',label:t('Omba makadirio ya bei','Request a quote'),Icon:FileText}];
 return <header className="market-header"><div className="container market-header-main"><details ref={drawer} className="sidebar-toggle"><summary className="market-menu" aria-label={t('Menyu ya duka','Store menu')} aria-controls="store-sidebar"><Menu className="sidebar-open-icon" size={23}/><PanelLeftClose className="sidebar-close-icon" size={23}/></summary><div id="store-sidebar" className="market-drawer" onClick={e=>{if(e.target===e.currentTarget&&drawer.current)drawer.current.open=false;}}><div className="drawer-panel"><div className="drawer-heading"><Brand/></div><nav aria-label="Drawer navigation" onClick={e=>{if((e.target as HTMLElement).closest('a')&&drawer.current)drawer.current.open=false}}>{nav.map(n=><Link key={n.to} to={n.to} className={route===n.to?'current':''}><n.Icon size={19}/><span>{n.label}</span></Link>)}<div className="drawer-divider"/><Link to="/account"><User size={19}/><span>{t('Akaunti yangu','My account')}</span></Link><Link to="/contact"><Headphones size={19}/><span>{t('Wasiliana nasi','Contact us')}</span></Link></nav></div></div></details><div className="sidebar-swipe-edge" aria-hidden="true"/><Brand/><div className="market-search-area"><form className="market-search" onSubmit={e=>{e.preventDefault();search()}}><label className="search-category"><span aria-hidden="true">{searchCategoryLabel}</span><ChevronDown size={13} aria-hidden="true"/><select aria-label={t('Chagua kundi la bidhaa','Search category')} value={category} onChange={e=>setCategory(e.target.value)}><option value="">{t('Bidhaa','Products')}</option>{shopCategories.map(c=><option key={c.id} value={c.id}>{en?c.nameEn:c.name}</option>)}</select></label><input aria-label={t('Tafuta bidhaa','Search products')} placeholder={t('Tafuta Arduino, sensors, motors…','Search Arduino, sensors, motors…')} value={query} onChange={e=>setQuery(e.target.value)}/><button aria-label={t('Tafuta','Search')}><Search size={20}/></button></form><div className="search-discover">{['Arduino','ESP32','Sensors','Motors','Raspberry Pi'].map(term=><Link key={term} to={'/shop?q='+encodeURIComponent(term)}>{term}</Link>)}</div>{query.length>1&&<div className="autocomplete">{matches.length?matches.map(p=><Link key={p.id} to={'/product/'+p.slug}><span>{p.name}</span><b>{money(displayPrice(p))}</b></Link>):<p>{t('Hakuna bidhaa inayolingana.','No matching products.')}</p>}</div>}</div><div className="market-account"><Language/><Link to="/wishlist" className="market-icon" aria-label={t('Zilizohifadhiwa','Saved products')}><Heart size={21}/></Link><Link to="/cart" className="market-icon" aria-label={t('Kikapu','Cart')}><ShoppingCart size={21}/><b>{count}</b></Link><Link to="/account" className="market-signin"><User size={18}/><span>{user?user.name.split(' ')[0]:t('Wasifu','Profile')}</span></Link></div></div></header>
}
function Language(){const {en,t,toggleLanguage}=useShop();return <button className="language" aria-label={t('Badili lugha','Switch language')} onClick={toggleLanguage}>{en?'EN':'SW'}<ChevronDown size={13}/></button>}

function Brand(){return <Link to="/" className="brand"><span className="brand-mark"><Zap size={25} fill="currentColor" aria-hidden="true"/></span><span className="brand-wordmark">chapa<span className="brand-light">tronix</span><small>Where Intelligence Meets Mechanics</small></span></Link>}
