type Fields={operation?:string;errorType?:string;count?:number;durationMs?:number;requestId?:string};
export function logEvent(event:string,fields:Fields={}){console.log(JSON.stringify({time:new Date().toISOString(),event,...fields}));}
