import test from 'node:test';
import assert from 'node:assert/strict';
import {createAsyncCache} from '../lib/async-cache.ts';
test('concurrent requests deduplicate; fresh cache is reused and expires',async()=>{let time=0,calls=0;const c=createAsyncCache(30,()=>time);const load=async()=>++calls;assert.deepEqual(await Promise.all([c.get(load),c.get(load)]),[1,1]);assert.equal(await c.get(load),1);time=31;assert.equal(await c.get(load),2)});
test('failed requests are retryable',async()=>{const c=createAsyncCache(30);await assert.rejects(c.get(async()=>{throw Error('failed')}));assert.equal(await c.get(async()=>42),42)});
test('invalidation prevents old in-flight values from repopulating cache',async()=>{const c=createAsyncCache(30);let resolve;const old=c.get(()=>new Promise(r=>{resolve=r}));await Promise.resolve();c.invalidate();assert.equal(await c.get(async()=>2),2);resolve(1);await old;assert.equal(await c.get(async()=>3),2)});
