'use client';
import {useEffect,useRef,useState} from 'react';
import {useShop,Link} from '../Store';

export default function PersonalDataExport(){
 const {api,t,notify,user}=useShop(),alive=useRef(false),owner=useRef(user?.id),[busy,setBusy]=useState(false),[page,setPage]=useState(0);
 useEffect(()=>{alive.current=true;owner.current=user?.id;return()=>{alive.current=false}},[user?.id]);
 async function download(){
  const accountId=user?.id;if(!accountId)return;
  const active=()=>alive.current&&owner.current===accountId;
  setBusy(true);
  try{
   const combined:Record<string,unknown>={};
   let current=1,hasMore=true;
   while(hasMore){
    setPage(current);
    const response=await api('account/export?page='+current);
    if(!active())return;
    if(response.profile?.id!==accountId)throw new Error(t('Akaunti imebadilika. Anza kupakua upya.','The account changed. Start the export again.'));
    if(current===1)combined.profile=response.profile;
    for(const key of ['addresses','orders','reviews','wishlist','messages'])combined[key]=[...((combined[key] as unknown[])||[]),...response[key]];
    hasMore=response.hasMore;current++;
   }
   if(!active())return;
   const url=URL.createObjectURL(new Blob([JSON.stringify(combined,null,2)],{type:'application/json'}));
   const anchor=document.createElement('a');anchor.href=url;anchor.download='chapa-tronix-personal-data.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
   notify(t('Taarifa zako zimeandaliwa kwa kupakua.','Your data is ready to download.'));
  }catch(error){if(active())notify((error as Error).message)}finally{if(active())setBusy(false)}
 }
 return <section className="panel"><h2>{t('Taarifa zako binafsi','Your personal data')}</h2><p>{t('Pakua taarifa za akaunti yako, anwani, oda, maoni, bidhaa ulizohifadhi na mazungumzo ya akaunti hii.','Download this account’s profile, addresses, orders, reviews, wishlist and conversations.')}</p><button type="button" className="button secondary" disabled={busy} onClick={download}>{busy?t('Inakusanya taarifa… ukurasa ','Collecting data… page ')+page:t('Pakua taarifa zangu (JSON)','Download my data (JSON)')}</button><p><Link to="/privacy">{t('Soma sera ya faragha','Read the privacy policy')}</Link></p><p>{t('Kwa maombi ya kurekebisha au kufuta taarifa, wasiliana na duka. Baadhi ya kumbukumbu za oda zinaweza kuhitaji kuhifadhiwa; kila ombi litapitiwa.','Contact the store to request corrections or erasure. Some order records may need to be retained; each request requires review.')}</p></section>;
}
