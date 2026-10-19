'use client';
import Image from 'next/image';
import {ArrowUpRight,Radio,Cog,Bot,Factory,BookOpen} from 'lucide-react';
import {guides,money} from '@/lib/catalog';
import {displayPrice,discountPercent,displayOffer} from '@/lib/pricing';
import {Link,ProductCard,SectionTitle,useShop} from '../Store';
import DiscountStrip from './DiscountStrip';
import CategoryCarousel from './CategoryCarousel';
export default function MarketplaceHome(){
 const {t,en,catalog,shopCategories}=useShop();
 const featured=catalog.filter(p=>p.featured),deals=catalog.filter(p=>{const o=displayOffer(p);return discountPercent(o.price,o.oldPrice)>0;});
 const hero=featured[0]||catalog[0],board=catalog.find(p=>p.categoryId==='boards'&&p.id!==hero?.id)||catalog[1],motor=catalog.find(p=>p.categoryId==='motors')||catalog[2];
 return <div className="market-home discovery-home">
  <section className="container discovery-opening">
   <div className="discovery-heading"><div><span className="eyebrow">CHAPA TRONIX / BUILD SOMETHING</span><h1>{t('Mradi mkubwa. Vifaa sahihi.','Big ideas. The right parts.')}</h1></div><Link to="/shop">{t('Bidhaa zote','All products')}<ArrowUpRight size={17}/></Link></div>
   <div className="discovery-panels">
    <article className="discovery-hero"><div><span className="commerce-label">{t('ANZA NA WAZO LAKO','START WITH YOUR IDEA')}</span><h2>{t('Kutoka wazo','From an idea')}<br/>{t('hadi saketi.','to a circuit.')}</h2><p>{t('Bodi, sensa na vifaa vya kuleta mradi wako kwenye uhalisia.','Boards, sensors and the parts to bring your next build to life.')}</p><Link to="/shop" className="button">{t('Tafuta vifaa','Explore parts')}<ArrowUpRight size={16}/></Link></div>{hero&&<Link className="discovery-hero-product" to={'/product/'+hero.slug}><Image src={hero.images[0]} alt={hero.name} width={520} height={440} priority sizes="(max-width:600px) 45vw, 360px"/><span><b>{hero.name}</b><small>{money(displayPrice(hero))}</small></span></Link>}<span className="discovery-outline" aria-hidden="true">+</span></article>
    {board&&<article className="discovery-pick"><div><span className="commerce-label">{t('BODI NA VIDHIBITI','BOARDS & CONTROLLERS')}</span><h2>{t('Unganisha.','Connect.')}<br/>{t('Programu. Jenga.','Code. Create.')}</h2></div><Link to={'/product/'+board.slug} className="discovery-pick-product"><Image src={board.images[0]} alt={board.name} width={300} height={230} sizes="(max-width:600px) 45vw, 260px"/><span><b>{board.name}</b><strong>{money(displayPrice(board))}</strong><ArrowUpRight size={18}/></span></Link></article>}
    {motor&&<article className="discovery-pick discovery-motion"><div><span className="commerce-label">{t('MOTA NA VIENDESHI','MOTORS & DRIVERS')}</span><h2>{t('Weka mradi','Bring your')}<br/>{t('kwenye mwendo.','build to life.')}</h2></div><Link to={'/product/'+motor.slug} className="discovery-pick-product"><Image src={motor.images[0]} alt={motor.name} width={300} height={230} sizes="(max-width:600px) 45vw, 260px"/><span><b>{motor.name}</b><strong>{money(displayPrice(motor))}</strong><ArrowUpRight size={18}/></span></Link></article>}
   </div>
  </section>
  <CategoryCarousel/>
  <DiscountStrip products={deals}/>
  <section className="container market-products"><SectionTitle small={t('KWA WORKBENCH YAKO','FOR YOUR WORKBENCH')} title={t('Chaguo za kuanza nazo','Start your next build')}/><div className="product-grid market-product-grid">{(featured.length?featured:catalog).slice(0,6).map(p=><ProductCard key={p.id} p={p}/>)}</div></section>
  <section className="container discovery-projects"><div><span className="commerce-label">{t('VIFAA KULINGANA NA MRADI','SHOP BY PROJECT')}</span><h2>{t('Unajenga nini?','What are you building?')}</h2><p>{t('Pata vifaa vinavyoendana na unachotengeneza.','Find the parts that fit what you are creating.')}</p></div>{[{id:'robot',Icon:Bot,name:t('Roboti','Robotics'),copy:'Boards / Sensors / Motors'},{id:'home',Icon:Radio,name:t('Udhibiti wa nyumbani','Home automation'),copy:'ESP32 / Relay / Wi-Fi'},{id:'cnc',Icon:Cog,name:'CNC & 3D printing',copy:'Stepper / Driver / Motion'}].map(p=><Link key={p.id} to={'/shop?project='+p.id}><p.Icon size={25}/><b>{p.name}</b><small>{p.copy}</small><ArrowUpRight size={17}/></Link>)}</section>
  <section className="container market-products discovery-recommendations"><SectionTitle title={t('Gundua vifaa zaidi','More to explore')} action={t('Fungua duka','Browse the store')}/><div className="product-grid market-product-grid">{catalog.slice(0,18).map(p=><ProductCard key={p.id} p={p}/>)}</div></section>
  <section className="container discovery-quote"><Factory size={30}/><div><h2>{t('Vifaa kwa darasa au karakana?','Equipping a classroom or workshop?')}</h2><p>{t('Tutumie orodha yako tukupangie makadirio ya bei.','Send your parts list and request a quote.')}</p></div><Link to="/quote" className="button">{t('Omba bei','Request a quote')}<ArrowUpRight size={16}/></Link></section>
  <section className="container market-learning"><SectionTitle title={t('Kutoka kufungua boksi hadi kujenga','From unboxing to building')} to="/learn" action={t('Mafunzo yote','All guides')}/><div className="guide-grid">{guides.map(g=><Link key={g.slug} to={'/learn/'+g.slug} className="market-guide"><Image src={'/images/'+g.image+'.jpg'} alt="" width={220} height={170}/><div><small>{t('JIFUNZE KWA VITENDO','LEARN BY DOING')}</small><h3>{en?g.en:g.title}</h3><span><BookOpen size={14}/>{t('Soma mwongozo','Read the guide')}</span></div></Link>)}</div></section>
 </div>;
}
