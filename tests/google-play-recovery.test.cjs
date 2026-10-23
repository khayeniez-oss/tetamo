const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const makeLoader = require('./load-ts.cjs');

const USER = '11111111-1111-4111-8111-111111111111';
const PROPERTY = '22222222-2222-4222-8222-222222222222';
const INTENT = '33333333-3333-4333-8333-333333333333';
const TOKEN = 'test-google-purchase-token';
const ACCOUNT = 'a'.repeat(64);

class Query {
  constructor(db, table) { this.db=db; this.table=table; this.filters=[]; this.params=[]; this.op='select'; this.columns='*'; }
  select(columns) { this.columns=columns; return this; }
  eq(column, value) { this.params.push(value); this.filters.push(`"${column}" = $${this.params.length}`); return this; }
  update(value) { this.op='update'; this.value=value; return this; }
  upsert(value, options) { this.op='upsert'; this.value=value; this.options=options; return this; }
  maybeSingle() { this.one=true; return this; }
  single() { this.one=true; return this; }
  async then(resolve,reject) {
    try {
      const params=[...this.params];
      const bind=(v)=> { params.push(v && typeof v==='object' ? JSON.stringify(v) : v); return `$${params.length}`; };
      const where=this.filters.length ? ` where ${this.filters.join(' and ')}` : '';
      let sql;
      if (this.op==='select') sql=`select ${this.columns} from public.${this.table}${where}`;
      if (this.op==='update') sql=`update public.${this.table} set ${Object.entries(this.value).map(([k,v])=>`"${k}"=${bind(v)}`).join(',')}${where} returning *`;
      if (this.op==='upsert') {
        const entries=Object.entries(this.value);
        sql=`insert into public.${this.table} (${entries.map(([k])=>`"${k}"`).join(',')}) values (${entries.map(([,v])=>bind(v)).join(',')}) on conflict (${this.options.onConflict}) `;
        sql+=this.options.ignoreDuplicates ? 'do nothing' : 'do update set '+entries.map(([k])=>`"${k}"=excluded."${k}"`).join(',');
        sql+=' returning *';
      }
      const {rows}=await this.db.query(sql,params);
      resolve({data:this.one ? rows[0] || null : rows,error:null});
    } catch (error) { resolve({data:null,error}); }
  }
}
async function fixture() {
  const db=new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create table public.google_play_purchase_intents (
      id uuid primary key,user_id uuid,property_id uuid,product_id text,google_product_id text,
      obfuscated_account_id text,status text default 'pending',google_purchase_token_sha256 text,
      consumed_at timestamptz,updated_at timestamptz default now());
    create table public.properties (
      id uuid primary key,user_id uuid,kode text,title text,source text,status text,
      verification_status text,verified_ok boolean,is_paused boolean,posted_date date,plan_id text,
      listing_expires_at timestamptz,featured_expires_at timestamptz,boost_expires_at timestamptz,spotlight_expires_at timestamptz,
      boost_active boolean default false,spotlight_active boolean default false,updated_at timestamptz);
    create table public.profiles(id uuid,full_name text,phone text,email text);
    create table public.payment_transactions (
      id uuid primary key,user_id uuid,property_id uuid,source_role text,payment_type text,product_id text,
      product_name_snapshot text,product_type text,audience_snapshot text,status text,currency text,
      amount_subtotal numeric,amount_discount numeric,amount_tax numeric,amount_total numeric,
      description text,plan_name text,duration_days int,property_title_snapshot text,property_code_snapshot text,
      customer_name text,customer_email text,customer_phone text,checkout_url text,paid_at timestamptz,metadata jsonb,
      created_at timestamptz,updated_at timestamptz);
  `);
  await db.exec(fs.readFileSync('supabase/migrations/20261023012543_google_play_product_recovery.sql','utf8'));
  await db.query(`insert into public.google_play_purchase_intents(id,user_id,property_id,product_id,google_product_id,obfuscated_account_id) values ($1,$2,$3,'basic','tetamo_owner_basic',$4)`,[INTENT,USER,PROPERTY,ACCOUNT]);
  await db.query(`insert into public.properties(id,user_id,kode,status) values ($1,$2,'TEST','draft')`,[PROPERTY,USER]);
  const admin={ from: table=>new Query(db,table), rpc: async(name,args)=> {
    try {
      const values=Object.values(args);
      const {rows}=await db.query(`select * from public.${name}(${values.map((_,i)=>`$${i+1}`).join(',')})`,values);
      return {data: rows,error:null};
    } catch(error) { return {data:null,error}; }
  }};
  let consumed=false,failConsume=false,consumeCalls=0;
  let purchaseState='PURCHASED';
  const load=makeLoader({
    'server-only':{},
    './google-play-server': {
      getGooglePlayObfuscatedAccountId:()=>ACCOUNT,
      getGooglePlayOneTimePurchase:async()=>({
        purchaseStateContext:{purchaseState},
        productLineItem:[{productId:'tetamo_owner_basic',productOfferDetails:{consumptionState:consumed?'CONSUMPTION_STATE_CONSUMED':'CONSUMPTION_STATE_YET_TO_BE_CONSUMED'}}],
        obfuscatedExternalAccountId:ACCOUNT,obfuscatedExternalProfileId:INTENT,
        orderId:'GPA.TEST',purchaseCompletionTime:'2026-10-23T01:00:00Z',
      }),
      consumeGooglePlayOneTimePurchase:async()=> { consumeCalls++; if(failConsume) throw Error('simulated Google outage'); consumed=true; },
    },
    '../app/data/pricelist': {getOwnerPackageById:()=>({durationDays:365,priceIdr:49000,name:'Basic'}),getAddOnProductById:()=>null},
  });
  return {db,admin,jobs:load('lib/google-play-jobs.ts'),setFail:v=>{failConsume=v;},setState:v=>{purchaseState=v;},calls:()=>consumeCalls};
}
async function enqueue(f, input={}) {
  return f.jobs.enqueueGoogleProduct(f.admin,USER,{purchaseToken:TOKEN,intentId:INTENT,productId:'basic',googleProductId:'tetamo_owner_basic',...input});
}
async function makeDue(f) { await f.db.exec("update public.google_play_product_jobs set next_attempt_at=now()-interval '1 second'"); }

test('Google failure after activation survives restart and retry does not extend twice',async()=>{
  const f=await fixture();
  try {
    const job=await enqueue(f); f.setFail(true);
    assert.equal((await f.jobs.runGoogleProductJob(f.admin,job.token_hash)).status,500);
    const before=(await f.db.query('select listing_expires_at from properties')).rows[0].listing_expires_at;
    const queued=(await f.db.query('select * from google_play_product_jobs')).rows[0];
    assert.equal(queued.state,'pending'); assert.equal(queued.purchase_token,TOKEN); assert.equal(queued.attempts,1);
    f.setFail(false); await makeDue(f);
    assert.equal((await f.jobs.runGoogleProductJob(f.admin,job.token_hash)).status,200);
    const after=(await f.db.query('select listing_expires_at from properties')).rows[0].listing_expires_at;
    assert.equal(+new Date(before),+new Date(after));
    assert.equal((await f.db.query('select count(*)::int as count from payment_transactions')).rows[0].count,1);
    const payment=(await f.db.query('select metadata from payment_transactions')).rows[0];
    assert.equal(payment.metadata.google_consumption_state,'CONSUMPTION_STATE_CONSUMED');
    assert.ok(payment.metadata.google_finalized_at);
    const done=(await f.db.query('select * from google_play_product_jobs')).rows[0];
    assert.equal(done.state,'completed'); assert.equal(done.purchase_token,null);
    assert.equal((await f.db.query('select status from google_play_purchase_intents')).rows[0].status,'consumed');
    assert.equal((await f.jobs.runGoogleProductJob(f.admin,job.token_hash)).status,200);
    assert.equal(f.calls(),2);
  } finally { await f.db.close(); }
});

test('duplicate and concurrent requests get one durable lease; expired lease recovers',async()=>{
  const f=await fixture();
  try {
    const job=await enqueue(f); await enqueue(f);
    const first=await f.admin.rpc('claim_google_play_product_job',{p_token_hash:job.token_hash,p_lease_id:crypto.randomUUID()});
    assert.equal(first.data.length,1);
    const second=await f.admin.rpc('claim_google_play_product_job',{p_token_hash:job.token_hash,p_lease_id:crypto.randomUUID()});
    assert.equal(second.data.length,0);
    assert.equal((await f.jobs.runGoogleProductJob(f.admin,job.token_hash)).status,503);
    await f.db.exec("update google_play_product_jobs set lease_expires_at=now()-interval '1 second'");
    assert.equal((await f.jobs.runGoogleProductJob(f.admin,job.token_hash)).status,200);
  } finally {await f.db.close();}
});

test('pending payment grants nothing and can complete on later retry',async()=>{
  const f=await fixture();
  try {
    f.setState('PENDING'); const job=await enqueue(f);
    assert.equal((await f.jobs.runGoogleProductJob(f.admin,job.token_hash)).status,409);
    assert.equal((await f.db.query('select count(*)::int as count from payment_transactions')).rows[0].count,0);
    assert.equal((await f.db.query('select state from google_play_product_jobs')).rows[0].state,'pending');
    f.setState('PURCHASED'); await makeDue(f);
    assert.equal((await f.jobs.runGoogleProductJob(f.admin,job.token_hash)).status,200);
  } finally {await f.db.close();}
});

test('recovery resolves original intent from Google; cross-account/property replay is rejected',async()=>{
  const f=await fixture();
  try {
    const job=await f.jobs.enqueueGoogleProduct(f.admin,USER,{purchaseToken:TOKEN});
    assert.ok(job.token_hash);
    await assert.rejects(()=>f.jobs.enqueueGoogleProduct(f.admin,'44444444-4444-4444-8444-444444444444',{purchaseToken:TOKEN,intentId:INTENT}));
    await assert.rejects(()=>enqueue(f,{propertyId:'another-listing'}));
  } finally {await f.db.close();}
});

test('refund restores only its own entitlement, records refund, and blocks replay',async()=>{
  const f=await fixture();
  try {
    const job=await enqueue(f); await f.jobs.runGoogleProductJob(f.admin,job.token_hash);
    const id=(await f.db.query('select id from payment_transactions')).rows[0].id;
    const first=(await f.db.query('select public.reconcile_google_play_product_refund($1,$2) as result',[id,{}])).rows[0].result;
    assert.equal(first.reviewRequired,false);
    const property=(await f.db.query('select status,listing_expires_at from properties')).rows[0];
    assert.equal(property.status,'draft'); assert.equal(property.listing_expires_at,null);
    assert.equal((await f.db.query('select status from payment_transactions')).rows[0].status,'refunded');
    assert.equal((await f.jobs.runGoogleProductJob(f.admin,job.token_hash)).status,409);
    const again=(await f.db.query('select public.reconcile_google_play_product_refund($1,$2) as result',[id,{}])).rows[0].result;
    assert.equal(again.alreadyProcessed,true);
  } finally {await f.db.close();}
});

test('refund preserves later entitlement and flags manual review',async()=>{
  const f=await fixture();
  try {
    const job=await enqueue(f); await f.jobs.runGoogleProductJob(f.admin,job.token_hash);
    const id=(await f.db.query('select id from payment_transactions')).rows[0].id;
    await f.db.exec("update properties set listing_expires_at='2030-01-01T00:00:00Z'");
    const result=(await f.db.query('select public.reconcile_google_play_product_refund($1,$2) as result',[id,{}])).rows[0].result;
    assert.equal(result.reviewRequired,true);
    assert.equal(new Date((await f.db.query('select listing_expires_at from properties')).rows[0].listing_expires_at).getUTCFullYear(),2030);
  } finally {await f.db.close();}
});

test('raw tokens and lease/refund functions are inaccessible to client roles',async()=>{
  const f=await fixture();
  try {
    await enqueue(f);
    await f.db.exec('set role authenticated');
    await assert.rejects(()=>f.db.query('select * from google_play_product_jobs'));
    await assert.rejects(()=>f.db.query('select * from claim_google_play_product_job($1,$2)',['a'.repeat(64),crypto.randomUUID()]));
    await assert.rejects(()=>f.db.query('select reconcile_google_play_product_refund($1,$2)',[PROPERTY,{}]));
  } finally {await f.db.close();}
});
