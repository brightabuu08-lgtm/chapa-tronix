'use client';
import {useState} from 'react';
import {Plus,Trash2,X,Upload} from 'lucide-react';
import {useShop,AsyncForm} from '../Store';
import {money,type Product} from '@/lib/catalog';
import InventoryAdjustment from './InventoryAdjustment';
import VariantManager from './VariantManager';
import {discountedPrice,discountPercent} from '@/lib/pricing';

export default function ProductEditor({product,onSaved,onCancel}:{product:Partial<Product>;onSaved:()=>Promise<void>;onCancel:()=>void}){
 const {t,en,api,notify,shopCategories,catalog,loadProducts,refreshCatalog}=useShop();
 const editing=!!product.id;
 const [inventory,setInventory]=useState({stock:product.stock||0,version:product.inventoryVersion||0});
 const [regular,setRegular]=useState(product.oldPrice||product.price||0),[percent,setPercent]=useState(discountPercent(product.price||0,product.oldPrice)),[images,setImages]=useState(product.images?.join(',')||''),[uploading,setUploading]=useState(false);
 const [specs,setSpecs]=useState(Object.entries(product.specs||{}));
 const [related,setRelated]=useState<string[]>(product.relatedIds||[]);
 const sale=regular>0&&percent>=0&&percent<=90?discountedPrice(regular,percent):0;
 async function upload(file:File){
  setUploading(true);try{let url:string;{const body=new FormData();body.append('file',file);const response=await fetch('/api/admin/product-image',{method:'POST',body,credentials:'same-origin'});const data=await response.json();if(!response.ok)throw new Error(data.error);url=data.publicUrl;}
   setImages(current=>current.trim()?current+','+url:url);notify(t('Picha imepakiwa. Hifadhi bidhaa.','Image uploaded. Save the product.'));
  }catch(error){notify((error as Error).message)}finally{setUploading(false)}
 }
 return <div className="admin-form product-editor"><div className="admin-toolbar"><h3>{editing?t('Hariri bidhaa','Edit product'):t('Ongeza bidhaa','New product')}</h3><button type="button" onClick={onCancel} aria-label={t('Funga fomu','Close editor')}><X/></button></div>
 <AsyncForm onSubmit={async data=>{
  const paths=images.split(',').map(v=>v.trim()).filter(Boolean);if(!paths.length)throw new Error(t('Pakia angalau picha moja.','Upload at least one image.'));
  const payload={id:data.id.trim(),slug:data.slug.trim(),name:data.name.trim(),sku:data.sku.trim(),brand:data.brand.trim(),price:sale,oldPrice:percent>0?regular:null,stock:Number(data.stock),categoryId:data.categoryId,voltage:data.voltage,interface:data.interface,description:data.description,descriptionEn:data.descriptionEn,compatibility:data.compatibility,compatibilityEn:data.compatibilityEn||null,images:paths,specs:Object.fromEntries(specs.filter(([key])=>key.trim()).map(([key,value])=>[key.trim(),value.trim()])),datasheet:data.datasheet?.trim()||null,featured:data.featured==='on',active:data.active==='on',relatedIds:related,projectTags:['robot','home','cnc'].filter(tag=>data['project-'+tag]==='on')};
  if(!sale)throw new Error(t('Weka bei halali na punguzo la 0–90%.','Enter a valid price and a discount from 0–90%.'));
  await api('admin/products'+(editing?'/'+product.id:''),payload,editing?'PATCH':'POST');await loadProducts([payload.id]);notify(t('Bidhaa imehifadhiwa.','Product saved.'));await onSaved();
 }}>
 <div className="form-grid">{[['id',t('Kitambulisho cha bidhaa','Product ID')],['slug',t('Jina kwenye anwani ya ukurasa','URL slug')],['name',t('Jina la bidhaa','Product name')],['sku','SKU'],['brand',t('Chapa','Brand')]].map(([key,label])=><label key={key}>{label}<input name={key} required defaultValue={String((product as any)[key]||'')} readOnly={editing&&key==='id'} maxLength={key==='name'?160:100}/></label>)}
 <label>{t('Kundi la bidhaa','Category')}<select name="categoryId" required defaultValue={product.categoryId&&!shopCategories.some(c=>c.id===product.categoryId)?'':product.categoryId||shopCategories[0]?.id}>{product.categoryId&&!shopCategories.some(c=>c.id===product.categoryId)&&<option value="" disabled>{t('Chagua kundi linalotumika','Choose an active category')}</option>}{shopCategories.map(c=><option key={c.id} value={c.id}>{en?c.nameEn:c.name}</option>)}</select></label>
 <label>{t('Idadi iliyopo dukani','Stock')}<input name="stock" type="number" min={0} max={100000} readOnly={editing} required {...(editing?{value:inventory.stock}:{defaultValue:product.stock||0})}/></label>
 <label>{t('Bei ya kawaida (TZS)','Regular price (TZS)')}<input name="price" type="number" min={1} max={100000000} required value={regular||''} onChange={e=>setRegular(Number(e.target.value))}/></label>
 <label>{t('Punguzo (%)','Discount (%)')}<input name="discountPercent" type="number" min={0} max={90} step="0.01" value={percent} onChange={e=>setPercent(Number(e.target.value))}/><small>{t('Weka 0 kuondoa punguzo.','Enter 0 to remove the discount.')}</small></label>
 <div className="discount-preview" role="status"><small>{t('Bei ya kuuza baada ya punguzo','Selling price after discount')}</small><strong>{money(sale)}</strong>{percent>0&&<span>{t('Mteja anaokoa','Customer saves')} {money(regular-sale)}</span>}</div>
 <label>{t('Volteji','Voltage')}<input name="voltage" defaultValue={product.voltage||''} maxLength={100}/></label><label>{t('Kiunganishi','Interface')}<input name="interface" defaultValue={product.interface||''} maxLength={100}/></label></div>
 <label>{t('Maelezo kwa Kiswahili','Swahili description')}<textarea name="description" required minLength={10} maxLength={5000} defaultValue={product.description}/></label><label>{t('Maelezo kwa Kiingereza','English description')}<textarea name="descriptionEn" required minLength={10} maxLength={5000} defaultValue={product.descriptionEn}/></label><label>{t('Vifaa vinavyoendana na tahadhari','Compatibility and precautions')}<textarea name="compatibility" defaultValue={product.compatibility||''} maxLength={3000}/></label>
 <label>{t('Maelezo ya ulinganifu kwa Kiingereza','English compatibility notes')}<textarea name="compatibilityEn" defaultValue={product.compatibilityEn||''} maxLength={3000}/></label>
 <label>{t('Datasheet ya mtengenezaji (HTTPS)','Manufacturer datasheet (HTTPS)')}<input name="datasheet" type="url" placeholder="https://" defaultValue={product.datasheet||''}/></label>
 <h4>{t('Sifa za kiufundi','Technical specifications')}</h4>{specs.map(([key,value],index)=><div className="spec-editor-row" key={index}><input aria-label={t('Jina la sifa','Specification name')} value={key} onChange={e=>setSpecs(specs.map((row,i)=>i===index?[e.target.value,row[1]]:row))}/><input aria-label={t('Maelezo ya sifa','Specification value')} value={value} onChange={e=>setSpecs(specs.map((row,i)=>i===index?[row[0],e.target.value]:row))}/><button type="button" aria-label={t('Ondoa sifa','Remove specification')} onClick={()=>setSpecs(specs.filter((_,i)=>i!==index))}><Trash2 size={18}/></button></div>)}<button type="button" className="button secondary small" onClick={()=>setSpecs([...specs,['','']])}><Plus size={16}/>{t('Ongeza sifa','Add specification')}</button>
 <label>{t('Picha za bidhaa','Product images')}<input name="images" required value={images} onChange={e=>setImages(e.target.value)} placeholder={t('Pakia picha hapa chini','Upload images below')}/><small>{t('Picha ya kwanza ndiyo kuu. Unaweza kupanga njia za picha kwa koma.','The first image is the main image. Separate image paths with commas.')}</small></label>
 <label className="image-upload"><Upload size={18}/>{t('Pakia picha','Upload images')}<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} onChange={async e=>{for(const file of Array.from(e.target.files||[]))await upload(file);e.target.value='';}}/></label>{uploading&&<p role="status">{t('Picha zinapakiwa…','Uploading images…')}</p>}
 <div className="image-edit-grid">{images.split(',').map(v=>v.trim()).filter(Boolean).map((src,index)=><div key={src}><img src={src} alt={t('Preview ya picha ya bidhaa','Product image preview')} width={160} height={120}/><button type="button" onClick={()=>setImages(images.split(',').filter((_,i)=>i!==index).join(','))} aria-label={t('Ondoa picha','Remove image')}><X size={16}/></button></div>)}</div>
 <fieldset className="editor-options"><legend>{t('Kuonekana dukani','Store visibility')}</legend><label className="check-label"><input name="active" type="checkbox" defaultChecked={product.active!==false}/>{t('Ionekane dukani','Publish in the store')}</label><label className="check-label"><input name="featured" type="checkbox" defaultChecked={product.featured}/>{t('Ionyeshwe kwenye bidhaa zinazopendekezwa','Feature on the home page')}</label></fieldset>
 <fieldset className="editor-options"><legend>{t('Miradi inayotumia bidhaa hii','Projects using this product')}</legend>{[['robot',t('Roboti','Robotics')],['home',t('Udhibiti wa vifaa vya nyumbani','Home automation')],['cnc','CNC / 3D printing']].map(([tag,label])=><label className="check-label" key={tag}><input type="checkbox" name={'project-'+tag} defaultChecked={product.projectTags?.includes(tag)}/>{label}</label>)}</fieldset>
 <label>{t('Bidhaa zinazopendekezwa pamoja nayo','Related product recommendations')}<select multiple value={related} onChange={e=>setRelated(Array.from(e.target.selectedOptions).map(o=>o.value).slice(0,8))}>{catalog.filter(p=>p.id!==product.id).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
 <button className="button" disabled={uploading}>{t('Hifadhi bidhaa','Save product')}</button>
 </AsyncForm>{editing&&<InventoryAdjustment productId={product.id!} stock={inventory.stock} version={inventory.version} initiallyOpen onSaved={async result=>{setInventory({stock:result.stock,version:result.inventoryVersion});await refreshCatalog();}}/>}{editing&&<VariantManager productId={product.id!}/>}</div>;
}
