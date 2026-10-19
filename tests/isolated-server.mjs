/** Prevent HTTP/browser fixtures from being written to a business server. */
export function assertTestServerUrl(base){
 const url=new URL(base),port=Number(url.port);
 if(url.protocol!=='http:'||!['localhost','127.0.0.1'].includes(url.hostname)||!(port===3107||port>=3110&&port<=3130))throw new Error('Use a local isolated test server on 3107 or 3110–3130. Business ports are forbidden.');
}
export async function assertIsolatedTestServer(base){
 assertTestServerUrl(base);
 let config;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const response=await fetch(base+'/api/config',{signal:AbortSignal.timeout(45000)});
   if(!response.ok)throw new Error('Test config HTTP '+response.status);
   config=await response.json();break;
  }catch(error){
   if(attempt===2)throw error;
   console.log('Test readiness retry after transient config request failure.');
   await new Promise(resolve=>setTimeout(resolve,1000));
  }
 }
 if(config.sellingMode!=='test'||config.isolatedTestDatabase!==true)throw new Error('Server is not connected to the isolated test database. No fixtures were submitted.');
 if(process.env.AUDIT_RUN_ID&&config.testRunId!==process.env.AUDIT_RUN_ID)throw new Error('Another test server owns this port. No fixtures were submitted.');
}
