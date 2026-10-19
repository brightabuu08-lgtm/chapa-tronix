'use client';
import {useEffect,useState} from 'react';

export default function SystemMessage({notFound=false,reset}:{notFound?:boolean;reset?:()=>void}){
 const [english,setEnglish]=useState(true);
 useEffect(()=>{try{setEnglish(localStorage.getItem('ct-language-choice')!=='sw');}catch{}},[]);
 const t=(en:string,sw:string)=>english?en:sw;
 return <main className="container page"><div className="empty" lang={english?'en':'sw'}>
  {notFound?<><h1>404</h1><h2>{t('Page not found','Ukurasa haujapatikana')}</h2><p>{t('Let’s find the parts for your next project.','Tuende tukatafute vifaa vya mradi wako.')}</p><a href="/shop" className="button">{t('Browse products','Angalia bidhaa')}</a></>:<><h1>{t('Something went wrong','Tumepata hitilafu')}</h1><p>{t('Please try again. Your cart is still saved on this device.','Jaribu tena. Kikapu chako bado kimehifadhiwa kwenye kifaa.')}</p><button onClick={reset} className="button">{t('Try again','Jaribu tena')}</button></>}
 </div></main>;
}
