'use client';
import SystemMessage from '@/components/storefront/SystemMessage';
export default function ErrorPage({reset}:{reset:()=>void}){return <SystemMessage reset={reset}/>;}
