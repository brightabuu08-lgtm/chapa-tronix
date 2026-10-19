'use client';
import {useState,type ReactNode} from 'react';
import {ExternalLink,LogOut,Zap} from 'lucide-react';
import {Link,useShop} from '../Store';
import {clearCheckoutSession} from '@/lib/checkout-attempt';

export default function AdminShell({children}:{children:ReactNode}){
 const {user,setUser,api,t,en,toggleLanguage,notify,preview,go}=useShop(),[busy,setBusy]=useState(false);
 const staff=user?.role==='ADMIN'||user?.role==='STAFF';
 return <div className="admin-workspace">
  <header className="admin-shell-header"><div className="container admin-shell-bar">
   <Link to="/admin" className="brand admin-shell-brand" aria-label={t('Chapa Tronix — usimamizi','Chapa Tronix — administration')}><span className="brand-mark"><Zap size={22} fill="currentColor" aria-hidden="true"/></span><span>chapa<span className="brand-light">tronix</span><small>{t('Usimamizi wa duka','Store administration')}</small></span></Link>
   <div className="admin-shell-tools">
    {staff&&<span className="admin-shell-identity"><b>{user.name}</b><small>{user.role==='ADMIN'?t('Msimamizi','Administrator'):t('Mfanyakazi','Staff')}</small></span>}
    <button type="button" className="admin-shell-control" aria-label={t('Badili lugha','Switch language')} onClick={toggleLanguage}>{en?'EN':'SW'}</button>
    <Link to="/shop" className="admin-shell-control admin-store-link" aria-label={t('Fungua duka','View store')}><ExternalLink size={17} aria-hidden="true"/><span>{t('Fungua duka','View store')}</span></Link>
    {staff&&!preview&&<button type="button" className="admin-shell-control" aria-label={t('Toka','Sign out')} disabled={busy} onClick={async()=>{setBusy(true);try{await api('auth/logout',{});clearCheckoutSession();setUser(null);go('/account');}catch(error){notify((error as Error).message);}finally{setBusy(false);}}}><LogOut size={17} aria-hidden="true"/><span>{t('Toka','Sign out')}</span></button>}
   </div>
  </div></header>
  {children}
  <footer className="admin-shell-footer"><div className="container"><span>chapa tronix</span><span>{t('Eneo la usimamizi','Administration workspace')}</span></div></footer>
 </div>;
}
