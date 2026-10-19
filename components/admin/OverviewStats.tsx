'use client';
import {Banknote,PackageSearch,ShoppingBag,Users} from 'lucide-react';
import {useShop} from '../Store';
import {money} from '@/lib/catalog';

export default function OverviewStats({revenue,orders,customers,lowStock}:{revenue:number;orders:number;customers:number;lowStock:number}){
 const {t}=useShop();
 const cards=[
  {label:t('Mapato yaliyopokelewa','Collected revenue'),value:money(revenue),note:t('Malipo yaliyothibitishwa','Verified payments'),Icon:Banknote,tone:'teal'},
  {label:t('Oda za hivi karibuni','Recent orders'),value:String(orders),note:t('Orodha ya oda za sasa','Current order list'),Icon:ShoppingBag,tone:'blue'},
  {label:t('Wateja','Customers'),value:String(customers),note:t('Akaunti zilizosajiliwa','Registered accounts'),Icon:Users,tone:'slate'},
  {label:t('Stock inayopungua','Low-stock alerts'),value:String(lowStock),note:t('Bidhaa zinazohitaji kuangaliwa','Items needing attention'),Icon:PackageSearch,tone:'amber'}
 ];
 return <div className="stats admin-metrics">{cards.map(card=><article key={card.tone} className={'stat admin-metric '+card.tone}><div><small>{card.label}</small><span><card.Icon size={18} aria-hidden="true"/></span></div><b>{card.value}</b><p>{card.note}</p></article>)}</div>;
}
