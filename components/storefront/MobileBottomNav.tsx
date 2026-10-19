'use client';
import {Cpu,Heart,ShoppingCart,User} from 'lucide-react';
import {Link,useShop} from '../Store';

export default function MobileBottomNav({route}:{route:string}){
 const {t,cart}=useShop();
 const count=cart.reduce((sum,item)=>sum+item.quantity,0);
 const active=route==='/'||route==='/shop'||route.startsWith('/product/')||route.startsWith('/category/')?'shop':route==='/cart'||route==='/checkout'?'cart':route==='/wishlist'?'saved':['/account','/reset-password','/verify-email'].includes(route)||route.startsWith('/admin')?'account':null;
 const items=[
  {id:'shop',to:'/shop',label:t('Duka','Shop'),Icon:Cpu},
  {id:'saved',to:'/wishlist',label:t('Zilizohifadhiwa','Saved'),Icon:Heart},
  {id:'cart',to:'/cart',label:t('Kikapu','Cart'),Icon:ShoppingCart},
  {id:'account',to:'/account',label:t('Akaunti','Account'),Icon:User}
 ];
 return <nav className="mobile-bottom" aria-label={t('Urambazaji wa simu','Mobile navigation')}>
  {items.map(item=><Link key={item.id} to={item.to} className={'mobile-nav-item'+(active===item.id?' is-active':'')} aria-current={active===item.id?'page':undefined}>
   <span className="mobile-nav-icon"><item.Icon size={20} strokeWidth={active===item.id?2.4:1.8} aria-hidden="true"/>{item.id==='cart'&&count>0&&<b className="mobile-cart-count" aria-label={t('Bidhaa kikapuni','Items in cart')}>{count>99?'99+':count}</b>}</span>
   <span>{item.label}</span>
  </Link>)}
 </nav>;
}
