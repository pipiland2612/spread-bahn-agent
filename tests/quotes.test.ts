import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as quotes from '../src/quotes.ts'
import { Model } from '../src/policy.ts'
import { Desk } from '../src/run.ts'
import { resolveSettings } from '../src/settings.ts'
import type { PriceRequest, DriverProfile } from '../vendor/spread/types.ts'
const hours = { opens: 420, closes: 1200, weekdays: [0,1,2,3,4], saturday: null }
const request = (): PriceRequest => ({ id:'r1',dealerId:'d1',batchId:null,arrivedAt:900,respondBy:915,note:null,referenceFeeCents:6000,
 legs:[{car:{premium:false,electric:false,chargePercent:null},pickup:{placeId:'a',privateAddress:false,window:{from:900,to:4080},hours},delivery:{placeId:'b',privateAddress:false,window:{from:900,to:4080},hours}}],
 options:[{kind:'same_day',deadline:1200,listPriceCents:10001},{kind:'next_day',deadline:2640,listPriceCents:9001}] })
const drivers = Array.from({length:20},(_,i)=>({id:`d${i}`,homePlaceId:'a',rating:5,licence:'manual',completedGigs:100,drops:0})) as DriverProfile[]
const model = new Model({places:[],roads:[{from:'a',to:'a',minutes:0,km:0},{from:'a',to:'b',minutes:110,km:150}]},drivers)
test('quote planner exists',()=>assert.equal(typeof quotes.planQuote,'function'))
test('later feasible option survives an infeasible first deadline',()=>{
 assert.deepEqual(quotes.planQuote(model,request(),900,{mode:'options',multiplier:1.1})?.prices,{next_day:9901})
})
test('first mode declines instead of accepting later work',()=>{
 assert.deepEqual(quotes.planQuote(model,request(),900,{mode:'first',multiplier:1})?.prices,{same_day:1000100})
})
test('reference share is checked against actual quote rather than list',()=>{
 const r=request();r.referenceFeeCents=9000
 assert.deepEqual(quotes.planQuote(model,r,900,{mode:'options',multiplier:0.8})?.prices,{same_day:1000100})
})
test('expired requests have no quote, even when declining',()=>{
 assert.equal(quotes.planQuote(model,request(),915,{mode:'options',multiplier:1}),null)
})
test('invalid or unsafe quotes are rejected',()=>{
 for(const multiplier of [0,-1,NaN,Infinity,1e20]) assert.throws(()=>quotes.planQuote(model,request(),900,{mode:'options',multiplier}))
 assert.throws(()=>quotes.planQuote(model,request(),900,{mode:'bad' as any,multiplier:1}))
})
test('Level 4 Desk emits later-option quote while Level 3 keeps prior selection',()=>{
 const desk=new Desk(model,4 as any,'legacy',undefined,'baseline',undefined,{mode:'options',multiplier:1} as any)
 desk.now=900;desk.quote(request())
 assert.deepEqual(desk.outbox,[{type:'quote',requestId:'r1',prices:{next_day:9001}}])
 const old=new Desk(model,3,'legacy');old.now=900;old.quote(request());assert.equal(old.outbox.length,0)
})
test('Level 4 settings preserve quote settings on resume and reject higher levels',()=>{
 const config=resolveSettings({level:'4','quote-mode':'options','quote-multiplier':'1.1'})
 assert.deepEqual(config.quotes,{mode:'options',multiplier:1.1})
 const world={worldId:'w4',kind:'practice',level:4,parent:null,season:null,boardRun:null,ended:false} as const
 const manifest={worldId:'w4',level:4,feeMode:config.mode,networkMode:config.network,policy:config.policy,quoteSettings:config.quotes}
 assert.deepEqual(resolveSettings({},manifest,world).quotes,{mode:'options',multiplier:1.1})
 assert.throws(()=>resolveSettings({level:'5'}))
 for(const value of ['','0','1.1junk','Infinity']) assert.throws(()=>resolveSettings({level:'4','quote-multiplier':value}))
 assert.throws(()=>resolveSettings({level:'4',opening:'.75','reference-share':'1.2','fee-mode':'legacy',network:'offers'},undefined,world),/quote/)
})
