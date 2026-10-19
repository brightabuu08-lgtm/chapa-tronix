'use client';
import {useEffect,useRef,useState} from 'react';
import Image from 'next/image';
import type {RobotRenderer} from '@/lib/robotics/renderer';
import {useShop} from '../Store';

export default function RobotScene({paused=false,onAvailabilityChange,immersive=false}:{paused?:boolean;onAvailabilityChange?:(available:boolean)=>void;immersive?:boolean}){
 const {t}=useShop(),canvas=useRef<HTMLCanvasElement>(null),renderer=useRef<RobotRenderer|null>(null);
 const pausedRef=useRef(paused);pausedRef.current=paused;
 const [status,setStatus]=useState<'loading'|'ready'|'fallback'>('loading');
 useEffect(()=>{
  let active=true;
  const fallback=()=>{if(!active)return;renderer.current?.dispose();renderer.current=null;setStatus('fallback');onAvailabilityChange?.(false);};
  import('@/lib/robotics/renderer').then(({createRobotRenderer})=>{if(!active||!canvas.current)return;try{renderer.current=createRobotRenderer(canvas.current,()=>{if(active)setStatus('ready');},fallback);renderer.current.setPaused(pausedRef.current);}catch{fallback();}}).catch(fallback);
  return()=>{active=false;renderer.current?.dispose();renderer.current=null;};
 },[onAvailabilityChange]);
 useEffect(()=>renderer.current?.setPaused(paused),[paused]);
 return <div className={'robot-studio '+status}>
  {status!=='ready'&&<picture><source media="(max-width:760px)" srcSet="/images/robot-workcell-mobile.webp"/><Image src="/images/robot-workcell.webp" width={1400} height={1020} alt={t('Mkono wa roboti wa metali kwenye kituo cha kupanga vifaa','Metal robotic arm at a component handling workstation')} sizes="100vw"/></picture>}
  <canvas ref={canvas} role="img" aria-hidden={status!=='ready'} aria-label={t('Mkono wa roboti wa 3D unashika bodi, unaihamisha na kuiweka kwenye conveyor.','A 3D robotic arm grips a board, transfers it and places it on a conveyor.')} data-immersive={immersive} data-motion="loading"/>
 </div>;
}
