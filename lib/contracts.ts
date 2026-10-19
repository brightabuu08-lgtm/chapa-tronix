import type {Product,ShopCategory} from './catalog';
export type PageResponse<T>={items:T[];page:number;pageSize:number;total:number;hasMore:boolean};
export type CatalogResponse={products:Product[];categories:ShopCategory[];page:number;pageSize:number;total:number;hasMore:boolean};
export type CheckoutResponse={order:{number:string;status:string;total:number};accessToken:string;paymentUrl?:string;paymentError?:string};
export type ProductDetailResponse=Product&{frequentlyBoughtIds:string[];reviews:{id:string;rating:number;text:string;user:{name:string}}[]};
export type ApiFailure={error:string};
