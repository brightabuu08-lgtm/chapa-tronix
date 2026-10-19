import {useCallback} from 'react';
export function useRouter(){return {push:useCallback((url:string)=>{history.pushState({},'',url);dispatchEvent(new PopStateEvent('popstate'));},[]),refresh:()=>{}};}

export function usePathname(){return typeof location==='undefined'?'/':location.pathname;}
export function useSearchParams(){return new URLSearchParams(typeof location==='undefined'?'':location.search);}
