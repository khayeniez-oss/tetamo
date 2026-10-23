const {test}=require('node:test');const assert=require('node:assert/strict');const makeLoader=require('./load-ts.cjs');
function fixture({transaction={productId:'tetamo.owner.basic',transactionId:'apple-tx',revocationDate:123},payment={id:'payment'},result={matched:true},error=null}={}){
 const calls=[];let verified=0;
 const query={select(){return this;},eq(){return this;},async maybeSingle(){return{data:payment,error:null};}};
 process.env.SUPABASE_URL='https://test.invalid';process.env.SUPABASE_SERVICE_ROLE_KEY='test-key';
 const load=makeLoader({'server-only':{},'./apple-iap-server':{verifyAppleSignedTransaction:async()=>{verified++;if(error)throw error;return transaction;}},'@supabase/supabase-js':{createClient:()=>({from:()=>query,rpc:async(name,args)=>{calls.push({name,args});return{data:result,error:null};}})}});
 return{run:load('lib/apple-product-refunds.ts').reconcileAppleProductRefund,calls,verified:()=>verified};
}
const event={environment:'production',notification:{notificationType:'REFUND',notificationUUID:'event',data:{signedTransactionInfo:'verified-jws'}}};
test('Apple one-time refund uses verified transaction and atomic reconciliation',async()=>{const f=fixture();assert.equal((await f.run(event)).handled,true);assert.equal(f.verified(),1);assert.equal(f.calls[0].name,'reconcile_apple_product_refund');assert.equal(f.calls[0].args.p_refund.transactionId,'apple-tx');});
test('Apple refund arriving before payment persistence requests redelivery',async()=>{const f=fixture({payment:null});assert.equal((await f.run(event)).retry,true);assert.equal(f.calls.length,0);});
test('invalid signed transaction or missing revocation cannot revoke an entitlement',async()=>{for(const config of [{error:Error('invalid signature')},{transaction:{productId:'tetamo.owner.basic',transactionId:'apple-tx'}}]){const f=fixture(config);await assert.rejects(f.run(event));assert.equal(f.calls.length,0);}});
test('subscription refunds keep their existing reconciliation path',async()=>{const f=fixture({transaction:{productId:'tetamo.agent.silver.yearly'}});assert.equal(await f.run(event),null);assert.equal(f.calls.length,0);});
