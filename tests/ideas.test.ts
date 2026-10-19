import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ideaSchema} from '../lib/ideas';
const input={name:'Asha Juma',email:'asha@example.com',phone:'0712345678',region:'Dar es Salaam',title:'Sensor irrigation system',stage:'idea',problem:'Farmers cannot monitor soil moisture during the day.',solution:'Use soil sensors and an ESP32 to control irrigation based on moisture levels.',support:'Components and technical advice for a prototype.',consent:true};
test('idea registration validates and normalizes contact details',()=>{assert.equal(ideaSchema.parse(input).phone,'+255712345678')});
test('idea requires consent and meaningful project details',()=>{for(const change of [{consent:false},{solution:'short'},{stage:'funded'},{phone:'123'}])assert.equal(ideaSchema.safeParse({...input,...change}).success,false)});
