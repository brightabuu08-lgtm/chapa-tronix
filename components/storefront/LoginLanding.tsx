'use client';
import {useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {ArrowRight,Eye,EyeOff} from 'lucide-react';
import {AsyncForm,Link,useShop,type Customer} from '../Store';
import {signInDestination} from '@/lib/access-policy';

export default function LoginLanding({databaseConfigured,embedded=false,onAuthenticated}:{databaseConfigured:boolean|null;embedded?:boolean;onAuthenticated?:(result:{user:Customer;destination?:string})=>void}){
 const {t,api,setUser,go}=useShop();
 const searchParams=useSearchParams();
 const [register,setRegister]=useState(false),[showPassword,setShowPassword]=useState(false);
 function changeMode(value:boolean){setRegister(value);setShowPassword(false);}
 return <section className={embedded?'login-landing compact-login embedded-login':'container login-landing compact-login'} aria-label={t('Akaunti yako','Your account')}>
  {!embedded&&<div className="login-intro">
   <h1 id="login-intro-title">{t('Wazo lako.','Your idea.')}<br/><span>{t('Vifaa vyake.','The right parts.')}</span></h1>
   <p className="login-intro-copy">{t('Vifaa vya mekatroniki kwa mradi wako unaofuata.','Mechatronics parts for your next build.')}</p>
   <Link className="button secondary" to="/">{t('Endelea kutazama bidhaa','Continue browsing')}<ArrowRight size={17} aria-hidden="true"/></Link>
  </div>}
  <div className="login-entry" id="login-entry" tabIndex={-1}>
   <div className="auth-card login-card">
    <div className="login-card-heading"><h2>{register?t('Anza na akaunti yako','Make room for your next project'):t('Karibu chapa tronix','Welcome to chapa tronix')}</h2><p>{register?t('Fungua akaunti ili ununue na ufuatilie oda zako.','Create an account to shop and keep track of your orders.'):t('Ingia ili ukamilishe ununuzi na ufuatilie oda zako.','Sign in to complete your purchase and track orders.')}</p></div>
    <div className="tabs login-tabs" aria-label={t('Chagua kuingia au kujisajili','Choose sign in or registration')}><button type="button" onClick={()=>changeMode(false)} aria-pressed={!register} className={!register?'selected':''}>{t('Ingia','Sign in')}</button><button type="button" onClick={()=>changeMode(true)} aria-pressed={register} className={register?'selected':''}>{t('Fungua akaunti','Create account')}</button></div>
    {databaseConfigured===false&&<p className="notice" role="status">{t('Huduma ya akaunti haipatikani kwa sasa. Tafadhali jaribu tena baadaye.','Account services are currently unavailable. Please try again later.')}</p>}
    <AsyncForm key={String(register)} onSubmit={async data=>{const result=await api('auth/'+(register?'register':'login'),data);setUser(result.user);if(onAuthenticated){onAuthenticated(result);return;}go(signInDestination(result.user,result.destination,searchParams.get('next')));}}>
     {register&&<label>{t('Jina kamili','Full name')}<input name="name" required minLength={2} autoComplete="name" placeholder={t('Jina lako kamili','Your full name')}/></label>}
     <label>{register?t('Barua pepe','Email address'):t('Barua pepe au namba ya simu','Email address or phone number')}<input name={register?'email':'identifier'} type={register?'email':'text'} required autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder={register?'jina@example.com':t('Barua pepe au 07…','Email or 07…')}/></label>
     {register&&<label>{t('Namba ya simu','Phone number')}<input type="tel" name="phone" required placeholder="0712345678" autoComplete="tel"/></label>}
     <label>{t('Nenosiri','Password')}<span className="login-password"><input name="password" type={showPassword?'text':'password'} minLength={register?12:1} maxLength={72} required autoComplete={register?'new-password':'current-password'} placeholder={register?t('Angalau vibambo 12','At least 12 characters'):t('Weka nenosiri lako','Enter your password')}/><button type="button" onClick={()=>setShowPassword(value=>!value)} aria-pressed={showPassword} aria-label={showPassword?t('Ficha nenosiri','Hide password'):t('Onyesha nenosiri','Show password')}>{showPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button></span>{register&&<small>{t('Tumia angalau vibambo 12.','Use at least 12 characters.')}</small>}</label>
     {!register&&<div className="login-recovery"><Link to="/reset-password">{t('Umesahau nenosiri?','Forgot your password?')}</Link></div>}
     <button className="button orange full login-submit">{register?t('Fungua akaunti','Create account'):t('Ingia dukani','Enter the store')}<ArrowRight size={18} aria-hidden="true"/></button>
    </AsyncForm>
    <p className="login-mode-prompt">{register?t('Tayari una akaunti?','Already have an account?'):t('Ni mara yako ya kwanza?','New here?')} <button type="button" onClick={()=>changeMode(!register)}>{register?t('Ingia hapa','Sign in here'):t('Jisajili hapa','Register here')}</button></p>
    <p className="login-privacy">{t('Taarifa zako zinatumika kusimamia akaunti na oda zako.','Your details are used to manage your account and orders.')} <Link to="/privacy">{t('Sera ya faragha','Privacy policy')}</Link></p>
   </div>
   <p className="login-help">{t('Unahitaji msaada wa kuingia?','Need help signing in?')} <Link to="/contact">{t('Wasiliana nasi','Contact us')}<ArrowRight size={13} aria-hidden="true"/></Link></p>
  </div>
 </section>;
}
