'use client';
import {useEffect,useRef} from 'react';
import {X} from 'lucide-react';
import {useShop} from '../Store';
import LoginLanding from './LoginLanding';
import VerifyAccess from './VerifyAccess';
import {needsEmailVerification} from '@/lib/access-policy';
export default function CheckoutAuthDialog({open,onClose,purpose='checkout'}:{open:boolean;onClose:()=>void;purpose?:'checkout'|'account'}){
 const {t,user,verificationRequired,go}=useShop(),dialog=useRef<HTMLDialogElement>(null);
 const titleId=purpose==='account'?'account-auth-title':'checkout-auth-title';
 const pendingVerification=needsEmailVerification(user,verificationRequired);
 useEffect(()=>{const node=dialog.current;if(!node)return;if(open&&!node.open){node.showModal();node.querySelector<HTMLInputElement>('input')?.focus({preventScroll:true});}if(!open&&node.open)node.close();return()=>{if(node.open)node.close();};},[open]);
 useEffect(()=>{if(open&&user&&!pendingVerification)onClose();},[open,user?.id,pendingVerification,onClose]);
 return <dialog ref={dialog} className={"checkout-auth-dialog"+(purpose==='account'?' account-auth-dialog':'')} aria-labelledby={titleId} onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget)onClose();}}><div className="checkout-auth-content"><button type="button" className="checkout-auth-close" aria-label={t('Funga na uendelee dukani','Close and continue browsing')} onClick={onClose}><X size={20}/></button><h2 id={titleId} className={purpose==='account'?'auth-dialog-accessible-title':undefined}>{purpose==='account'?t('Ingia au fungua akaunti','Sign in or create an account'):t('Hatua ya mwisho ya ununuzi','Finish your purchase')}</h2>{purpose==='checkout'&&<p>{t('Ingia au tengeneza akaunti ili tukupokee oda. Kikapu na taarifa zako zitabaki hapa.','Sign in or create an account so we can receive your order. Your cart and details stay here.')}</p>}{pendingVerification?<VerifyAccess/>:<LoginLanding databaseConfigured={true} embedded onAuthenticated={result=>{if(purpose==='account'&&['ADMIN','STAFF'].includes(result.user.role)){onClose();go(result.destination||'/admin');}}}/>}</div></dialog>;
}
