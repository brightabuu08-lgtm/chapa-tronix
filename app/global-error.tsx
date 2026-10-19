'use client';
import SystemMessage from '@/components/storefront/SystemMessage';

export default function GlobalError({reset}:{reset:()=>void}){
 return <html lang="en"><body style={{margin:0,padding:'48px 24px',fontFamily:'Arial, sans-serif',color:'#173a43',background:'#f5f6f7'}}><SystemMessage reset={reset}/></body></html>;
}
