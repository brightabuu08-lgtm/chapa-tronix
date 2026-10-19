export function discountedPrice(regularPrice:number,percent:number){
 if(!Number.isInteger(regularPrice)||regularPrice<1||!Number.isFinite(percent)||percent<0||percent>90)throw new Error('Enter a positive TZS price and a discount from 0 to 90%.');
 return Math.max(1,Math.round(regularPrice*(100-percent)/100));
}
export const discountPercent=(price:number,oldPrice?:number|null)=>oldPrice&&oldPrice>price?Math.round((1-price/oldPrice)*10000)/100:0;
export type PricedVariant={id:string;name:string;price:number;stock:number;active?:boolean;oldPrice?:number|null};
export function cartSelection(product:{name:string;price:number;stock:number;variants?:PricedVariant[]},variantId?:string){
 if(!variantId)return {name:product.name,price:product.price,stock:product.stock};
 const variant=product.variants?.find(v=>v.id===variantId&&v.active!==false);
 return variant?{name:product.name+' · '+variant.name,price:variant.price,stock:variant.stock}:null;
}

export function displayOffer(product:{price:number;oldPrice?:number|null;stock:number;variants?:PricedVariant[]}){
 const variants=product.variants?.filter(v=>v.active!==false)||[];
 const candidates=[...(product.stock>0||!variants.length?[product]:[]),...variants];
 return candidates.reduce((best,offer)=>offer.price<best.price?offer:best);
}
export function displayPrice(product:{price:number;stock:number;variants?:PricedVariant[]}){return displayOffer(product).price;}
