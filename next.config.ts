import type { NextConfig } from 'next';
import {sharingEnvironment} from './scripts/start-ngrok-site.mjs';
// An explicitly configured public origin takes priority over inherited loopback URLs.
if(process.env.PUBLIC_SITE_URL)Object.assign(process.env,sharingEnvironment(process.env.PUBLIC_SITE_URL,Number(process.env.PORT)||5186));
const trustedUrls=[process.env.PUBLIC_SITE_URL,process.env.APP_URL,...(process.env.TRUSTED_ORIGINS||'').split(',')];
const allowedDevOrigins=trustedUrls.flatMap(value=>{try{const url=new URL(value||'');return ['http:','https:'].includes(url.protocol)?[url.hostname]:[]}catch{return []}});
const remoteImage=process.env.S3_PUBLIC_URL?new URL(process.env.S3_PUBLIC_URL):null;
const config: NextConfig = { allowedDevOrigins: [...new Set(allowedDevOrigins)], distDir: process.env.NEXT_DIST_DIR||'.next', output: process.platform==='win32'?undefined:'standalone', devIndicators: false, poweredByHeader: false, images: { remotePatterns: remoteImage?[{protocol:remoteImage.protocol.replace(':','') as 'https'|'http',hostname:remoteImage.hostname,port:remoteImage.port,pathname:remoteImage.pathname.replace(/\/$/,'')+'/**'}]:[] }, async headers() { return [{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Frame-Options',value:'DENY'},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},{key:'Strict-Transport-Security',value:'max-age=31536000; includeSubDomains'}]}]; } };
export default config;
