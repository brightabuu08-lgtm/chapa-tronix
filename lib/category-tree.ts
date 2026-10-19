export function categoryMatches(categoryId:string,selected:string,categories:{id:string;parentId?:string|null}[]){
 if(!selected)return true;const seen=new Set<string>();let current:string|undefined=categoryId;
 while(current&&!seen.has(current)){if(current===selected)return true;seen.add(current);current=categories.find(c=>c.id===current)?.parentId||undefined;}return false;
}
export function categoryDepth(id:string,categories:{id:string;parentId?:string|null}[]){let depth=0,current=categories.find(c=>c.id===id),seen=new Set<string>();while(current?.parentId&&!seen.has(current.id)&&depth<5){seen.add(current.id);depth++;current=categories.find(c=>c.id===current?.parentId);}return depth;}
