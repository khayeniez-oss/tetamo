const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs');
const USER='11111111-1111-4111-8111-111111111111';
const PROPERTY='22222222-2222-4222-8222-222222222222';
const PAYMENT='33333333-3333-4333-8333-333333333333';
async function fixture(){
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role;
 create table properties(id uuid primary key,user_id uuid,kode text,status text,verification_status text,
 verified_ok boolean,is_paused boolean,posted_date date,plan_id text,listing_expires_at timestamptz,
 featured_expires_at timestamptz,boost_expires_at timestamptz,spotlight_expires_at timestamptz,
 boost_active boolean,spotlight_active boolean,updated_at timestamptz);
 create table payment_transactions(id uuid primary key,user_id uuid,property_id uuid,product_id text,status text,metadata jsonb,updated_at timestamptz);
 create table google_play_product_jobs(property_id uuid,lease_expires_at timestamptz);
 `);
 await db.exec(fs.readFileSync('supabase/migrations/20261023044212_apple_product_atomic_activation.sql','utf8'));
 await db.query("insert into properties(id,user_id,kode,status) values($1,$2,'TEST','draft')",[PROPERTY,USER]);
 await db.query(`insert into payment_transactions values($1,$2,$3,'basic','paid','{"gateway":"apple"}',now())`,[PAYMENT,USER,PROPERTY]);
 return db;
}
async function finalize(db,type='owner-listing',user=USER,payment=PAYMENT){
 return (await db.query('select finalize_apple_product_purchase($1,$2,$3,30,0,$4) as result',[payment,user,PROPERTY,type])).rows[0].result;
}
async function refund(db){return (await db.query("select reconcile_apple_product_refund($1,'{}') as result",[PAYMENT])).rows[0].result;}

test('replayed and concurrent Apple callbacks grant one entitlement',async()=>{
 const db=await fixture();try{
 const results=await Promise.all([finalize(db),finalize(db),finalize(db)]);
 assert.equal(results[0].done,true); assert.deepEqual(results[1],results[0]);assert.deepEqual(results[2],results[0]);
 const row=(await db.query('select listing_expires_at from properties')).rows[0];
 assert.equal(new Date(row.listing_expires_at).toISOString(),new Date(results[0].expiresAt).toISOString());
 }finally{await db.close();}
});
test('receipt failure rolls property activation back and retry grants only once',async()=>{
 const db=await fixture();try{
 await db.exec(`create function fail_receipt() returns trigger language plpgsql as $$ begin raise exception 'receipt interrupted'; end; $$;
 create trigger fail before update on payment_transactions for each row execute function fail_receipt();`);
 await assert.rejects(finalize(db),/receipt interrupted/);
 assert.equal((await db.query('select listing_expires_at,status from properties')).rows[0].listing_expires_at,null);
 await db.exec('drop trigger fail on payment_transactions');
 assert.equal((await finalize(db)).done,true);
 assert.deepEqual(await finalize(db),await finalize(db));
 }finally{await db.close();}
});
test('different Apple purchases extend serially without overwriting each other',async()=>{
 const db=await fixture();try{
 const first=await finalize(db);const second='44444444-4444-4444-8444-444444444444';
 await db.query('insert into payment_transactions select $1,user_id,property_id,product_id,status,\'{"gateway":"apple"}\',now() from payment_transactions where id=$2',[second,PAYMENT]);
 const next=await finalize(db,'owner-listing',USER,second);
 assert.equal(new Date(next.expiresAt)-new Date(first.expiresAt),30*86400000);
 }finally{await db.close();}
});
test('Apple refund restores exact grant once; refunded receipt cannot reactivate',async()=>{
 const db=await fixture();try{
 await finalize(db);assert.equal((await refund(db)).reviewRequired,false);
 const row=(await db.query('select listing_expires_at,status from properties')).rows[0];assert.equal(row.listing_expires_at,null);assert.equal(row.status,'draft');
 assert.equal((await refund(db)).alreadyProcessed,true);await assert.rejects(finalize(db),/does not match/);
 }finally{await db.close();}
});
test('Apple refund preserves later purchases and flags entitlement review',async()=>{
 const db=await fixture();try{
 await finalize(db);await db.exec("update properties set listing_expires_at=listing_expires_at+interval '1 day'");
 const before=(await db.query('select listing_expires_at from properties')).rows[0].listing_expires_at;
 assert.equal((await refund(db)).reviewRequired,true);
 assert.deepEqual((await db.query('select listing_expires_at from properties')).rows[0].listing_expires_at,before);
 }finally{await db.close();}
});
test('Apple activation rejects wrong owner and waits for a Google purchase lease',async()=>{
 const db=await fixture();try{
 await assert.rejects(finalize(db,'owner-listing',PROPERTY),/does not match/);
 await db.query("insert into google_play_product_jobs values($1,now()+interval '1 minute')",[PROPERTY]);
 await assert.rejects(finalize(db),/Another store purchase/);
 }finally{await db.close();}
});
test('Apple finalization and refund RPCs are service role only',async()=>{
 const db=await fixture();try{
 const {rows}=await db.query(`select has_function_privilege('anon','finalize_apple_product_purchase(uuid,uuid,uuid,integer,integer,text)','execute') a,
 has_function_privilege('authenticated','reconcile_apple_product_refund(uuid,jsonb)','execute') b,
 has_function_privilege('service_role','finalize_apple_product_purchase(uuid,uuid,uuid,integer,integer,text)','execute') c`);
 assert.deepEqual(rows[0],{a:false,b:false,c:true});
 }finally{await db.close();}
});
