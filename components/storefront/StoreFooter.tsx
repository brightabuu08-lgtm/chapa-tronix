'use client';
import {MapPin,Zap} from 'lucide-react';
import {Link,useShop} from '../Store';

export default function StoreFooter(){
 const {t,business,user}=useShop();
 const groups=[
  {title:t('Duka','Shop'),items:[['/shop',t('Bidhaa','Products')],['/shop?sort=new',t('Bidhaa mpya','New arrivals')],['/quote',t('Bei kwa taasisi','Institutional quotes')],['/learn',t('Mafunzo','Learning hub')]]},
  {title:t('Msaada','Support'),items:[['/track-order',t('Fuatilia oda','Track order')],['/contact',t('Wasiliana nasi','Contact us')],['/shipping',t('Usafirishaji','Shipping')],['/returns',t('Marejesho na dhamana','Returns & warranty')],['/faq',t('Maswali na majibu','FAQs')]]}
 ];
 return <footer className="store-footer"><div className="container store-footer-grid">
  <div className="store-footer-brand"><Link to="/" className="brand"><span className="brand-mark"><Zap size={20} fill="currentColor" aria-hidden="true"/></span><span>chapa<span className="brand-light">tronix</span></span></Link>
   <p>{t('Bodi, sensa na mota kwa masomo, miradi na kazi za ufundi.','Boards, sensors and motors for study, projects and the workshop.')}</p>
   <span className="store-footer-location"><MapPin size={16} aria-hidden="true"/>{business.address}</span>
  </div>
  {groups.map(group=><nav key={group.title} className="store-footer-links" aria-label={group.title}><h2>{group.title}</h2>{group.items.map(([to,label])=><Link key={to} to={to}>{label}</Link>)}</nav>)}
  <div className="store-footer-payments"><h2>{t('Njia za malipo','Payment methods')}</h2><div className="store-payment-list"><span>{t('Fedha taslimu','Cash only')}</span></div><p>{t('Lipa kwa fedha taslimu unapopokea oda au kuichukua dukani.','Pay cash when your order is delivered or collected in store.')}</p></div>
 </div><div className="container store-footer-bottom"><small>© {new Date().getFullYear()} chapa tronix</small><nav aria-label={t('Taarifa za biashara','Business information')}><Link to="/about">{t('Kuhusu sisi','About us')}</Link><Link to="/privacy">{t('Faragha','Privacy')}</Link><Link to="/terms">{t('Masharti','Terms')}</Link>{user&&user.role!=='CUSTOMER'&&<Link to="/admin">{t('Usimamizi','Admin')}</Link>}</nav></div></footer>;
}
