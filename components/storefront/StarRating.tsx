'use client';
import {useId,useState} from 'react';
import {Star} from 'lucide-react';

export default function StarRating({value=0,label,className=''}:{value?:number;label:string;className?:string}){
 const rating=Math.max(0,Math.min(5,Number.isFinite(value)?value:0));
 return <span className={'star-rating '+className} role="img" aria-label={label}>{[0,1,2,3,4].map(i=><span className="rating-star" aria-hidden="true" key={i}><Star/><span style={{width:Math.max(0,Math.min(1,rating-i))*100+'%'}}><Star fill="currentColor"/></span></span>)}</span>;
}

export function StarRatingInput({legend,label}:{legend:string;label:(value:number)=>string}){
 const id=useId(),[value,setValue]=useState(5),[hover,setHover]=useState(0);
 return <fieldset className="rating-input"><legend>{legend}</legend><div onMouseLeave={()=>setHover(0)}>{[1,2,3,4,5].map(n=><label key={n} htmlFor={id+'-'+n} onMouseEnter={()=>setHover(n)} className={n<=(hover||value)?'is-filled':''}><input id={id+'-'+n} type="radio" name="rating" value={n} checked={value===n} onFocus={()=>setHover(0)} onChange={()=>{setValue(n);setHover(0);}} required/><Star aria-hidden="true"/><span className="rating-label">{label(n)}</span></label>)}</div></fieldset>;
}
