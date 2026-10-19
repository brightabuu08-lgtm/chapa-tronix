import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {uploadedImage,isLocalProductImage} from '../lib/product-images';
test('product upload decodes PNG and stores a resized WebP',async()=>{
 const bytes=await sharp({create:{width:2000,height:1000,channels:3,background:'#14aa77'}}).png().toBuffer();
 const form=new FormData();form.append('file',new File([new Uint8Array(bytes)],'test.png',{type:'image/png'}));
 const result=await uploadedImage(new Request('http://localhost/api/admin/product-image',{method:'POST',body:form}));
 const metadata=await sharp(result).metadata();assert.equal(metadata.format,'webp');assert.equal(metadata.width,1600);assert.equal(metadata.height,800);
});
test('product upload rejects a fake PNG and HTML payload',async()=>{
 for(const type of ['image/png','text/html']){const form=new FormData();form.append('file',new File(['<script>bad</script>'],'test.png',{type}));await assert.rejects(()=>uploadedImage(new Request('http://localhost/api/admin/product-image',{method:'POST',body:form})));}
});
test('product upload rejects oversized requests before reading the body',async()=>{
 await assert.rejects(()=>uploadedImage(new Request('http://localhost/api/admin/product-image',{method:'POST',headers:{'Content-Type':'multipart/form-data; boundary=test','Content-Length':String(6*1024*1024)},body:'test'})));
});
test('product image paths permit only generated image filenames',()=>{
 assert.ok(isLocalProductImage('/media/11111111-2222-3333-4444-555555555555.webp'));
 for(const path of ['/media/../credentials.json','/media/test.svg','https://evil.test/image.webp','/images/test.png'])assert.ok(!isLocalProductImage(path));
});
