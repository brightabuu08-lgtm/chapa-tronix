'use client';
import {useEffect,useState} from 'react';
import {ArrowUpRight,Lightbulb,X} from 'lucide-react';
import {Link,useShop} from '../Store';

export default function StoreNotices(){
 const {t}=useShop();const [idea,setIdea]=useState(true);
 useEffect(()=>{try{setIdea(sessionStorage.getItem('ct-hide-idea')!=='yes');}catch{}},[]);
 function dismiss(){setIdea(false);try{sessionStorage.setItem('ct-hide-idea','yes');}catch{}}
 if(!idea)return null;
 return <aside className="store-notices" aria-label={t('Habari za duka','Store notices')}><div className="container store-notice-grid">
  {idea&&<div className="store-notice"><Lightbulb size={19} aria-hidden="true"/><div><b>{t('Una wazo la mradi?','Have a project idea?')}</b><span>{t('Lisajili. Ufadhili unakuja baadaye.','Register it. Funding opens later.')}</span></div><Link to="/ideas" className="notice-action">{t('Sajili','Register')}<ArrowUpRight size={15} aria-hidden="true"/></Link><button type="button" className="notice-dismiss" aria-label={t('Ficha taarifa ya mawazo','Dismiss project notice')} onClick={()=>dismiss()}><X size={15}/></button></div>}

 </div></aside>;
}
