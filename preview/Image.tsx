import type { ImgHTMLAttributes } from 'react';
export default function Image({fill,priority,unoptimized,quality,...props}:ImgHTMLAttributes<HTMLImageElement>&{fill?:boolean;priority?:boolean;unoptimized?:boolean;quality?:number}){return <img {...props} loading={priority?'eager':'lazy'} style={{...props.style,...(fill?{width:'100%',height:'100%',objectFit:'contain' as const}:{})}}/>}
