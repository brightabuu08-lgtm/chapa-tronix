import type {Metadata} from 'next';
import './globals.css';
import './mobile.css';
import './footer.css';
import './admin.css';
import './access.css';
import './login-landing.css';
import './robotics-demo.css';
import './storefront-refresh.css';
import './admin-polish.css';
import './immersive-login.css';
import './minimal.css';
import './marketplace.css';
import './compact.css';
export const metadata:Metadata={metadataBase:new URL(process.env.APP_URL||process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000'),title:{default:'chapa tronix | Parts for your next idea',template:'%s | chapa tronix'},description:'Arduino, ESP32, sensors and motors for your next project. Mechatronics parts from Kigamboni, Dar es Salaam.',icons:{icon:'/favicon.svg'},openGraph:{title:'chapa tronix',description:'Where Intelligence Meets Mechanics',type:'website',locale:'en_TZ',images:['/images/hero.jpg']}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>}
