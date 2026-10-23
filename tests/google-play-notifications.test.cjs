const {test} = require('node:test');
const assert = require('node:assert/strict');
const makeLoader = require('./load-ts.cjs');
function fixture(identity={email:'pubsub@example.iam.gserviceaccount.com',email_verified:true}) {
  process.env.GOOGLE_PLAY_RTDN_AUDIENCE='https://www.tetamo.com/api/google/play/notifications';
  process.env.GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL='pubsub@example.iam.gserviceaccount.com';
  const calls=[];let fail=false;
  const load=makeLoader({
    'google-auth-library':{OAuth2Client:class{async verifyIdToken(args){assert.equal(args.audience,process.env.GOOGLE_PLAY_RTDN_AUDIENCE);if(args.idToken!=='signed-google-token')throw Error('invalid JWT');return{getPayload:()=>identity};}}},
    '@/lib/google-play-admin':{googlePlayAdmin:()=>({})},
    '@/lib/google-play-server':{TETAMO_PARTNER_ANDROID_PACKAGE:'com.tetamo.partner'},
    '@/lib/google-play-jobs':{
      enqueueGoogleProduct:async(_admin,user,input)=>{calls.push({user,input});if(fail)throw Error('database unavailable');return{token_hash:'hash'};},
      runGoogleProductJob:async()=>new Response(null,{status:200}),
    },
    '@/lib/google-play-refunds':{reconcileGoogleProductRefunds:async()=>{calls.push('refund');}},
  });
  const route=load('app/api/google/play/notifications/route.ts');
  const request=(body,authorization='Bearer signed-google-token')=>new Request(process.env.GOOGLE_PLAY_RTDN_AUDIENCE,{method:'POST',headers:{authorization},body:JSON.stringify({message:{data:Buffer.from(JSON.stringify(body)).toString('base64')}})});
  return{route,request,calls,setFail:()=>{fail=true;}};
}
test('forged or wrong-identity notifications never enqueue purchases',async()=>{
  const f=fixture({email:'attacker@example.com',email_verified:true});
  assert.equal((await f.route.POST(f.request({},'Bearer forged'))).status,401);
  assert.equal((await f.route.POST(f.request({}))).status,403);
  assert.equal(f.calls.length,0);
});
test('authenticated one-time purchase is durably enqueued without client listing context',async()=>{
  const f=fixture();
  const body={packageName:'com.tetamo.partner',oneTimeProductNotification:{notificationType:1,purchaseToken:'google-token'}};
  assert.equal((await f.route.POST(f.request(body))).status,204);
  assert.deepEqual(f.calls[0],{user:null,input:{purchaseToken:'google-token'}});
  f.setFail();
  assert.equal((await f.route.POST(f.request(body))).status,503);
});
test('wrong package is rejected and signed refund notifications query Google',async()=>{
  const f=fixture();
  assert.equal((await f.route.POST(f.request({packageName:'other.app',testNotification:{}}))).status,400);
  assert.equal((await f.route.POST(f.request({packageName:'com.tetamo.partner',voidedPurchaseNotification:{}}))).status,204);
  assert.deepEqual(f.calls,['refund']);
});
