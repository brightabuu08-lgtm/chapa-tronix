'use client';
import {Shield} from 'lucide-react';
import {useShop,AsyncForm,Link} from '../Store';
import {accountDestination} from '@/lib/access-policy';
import {clearCheckoutSession} from '@/lib/checkout-attempt';

export default function AdminAccess(){
 const {user,setUser,api,t,notify,go}=useShop();
 return <section className="container page admin-access"><div className="admin-access-intro"><Shield size={32} aria-hidden="true"/><h1>{t('Eneo la wafanyakazi','Staff area')}</h1><p>{t('Ingia kusimamia bidhaa, stock, oda na mawasiliano ya duka.','Sign in to manage products, inventory, orders and store communications.')}</p></div>
  {user?<div className="auth-card"><h2>{t('Akaunti haina ruhusa za usimamizi','This account has no staff access')}</h2><p>{t('Umeingia kwa akaunti ya mteja. Tumia akaunti ya staff au admin kufungua dashboard hii.','You are signed in as a customer. Use a staff or administrator account to access this dashboard.')}</p><button type="button" className="button" onClick={async()=>{try{await api('auth/logout',{});clearCheckoutSession();setUser(null);}catch(error){notify((error as Error).message);}}}>{t('Badili akaunti','Switch account')}</button><Link to="/account" className="text-button">{t('Rudi kwenye akaunti yangu','Back to my account')}</Link></div>:
  <AsyncForm className="auth-card" onSubmit={async value=>{const result=await api('auth/login',value);setUser(result.user);go(result.destination||accountDestination(result.user));}}>
   <h2>{t('Ingia kwenye usimamizi','Administration sign-in')}</h2>
   <label>{t('Barua pepe au simu','Email or phone')}<input name="identifier" required autoComplete="username"/></label>
   <label>{t('Nenosiri','Password')}<input name="password" required type="password" maxLength={72} autoComplete="current-password"/></label>
   <button className="button orange full">{t('Ingia','Sign in')}</button>
   <Link to="/reset-password" className="text-button">{t('Umesahau nenosiri?','Forgot your password?')}</Link>
  </AsyncForm>}
 </section>;
}
