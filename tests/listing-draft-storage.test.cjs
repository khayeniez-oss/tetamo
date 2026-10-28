const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const vm=require('node:vm');
const exportsObject={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/listing-draft-storage.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:exportsObject});
const {listingDraftKey,restoreListingDraft,serializeListingDraft}=exportsObject;
test('draft keys isolate accounts, roles, create and separate edits',()=>{
 const keys=[listingDraftKey('a','owner'),listingDraftKey('b','owner'),listingDraftKey('a','agent'),listingDraftKey('a','owner','one'),listingDraftKey('a','owner','two')];assert.equal(new Set(keys).size,5);
});
test('draft round trip retains decimal input, appliances and rental period',()=>{
 const draft={lt:'1,2',landUnit:'are',rentalType:'harian',fasilitas:{fac_fridge:true},address:'Test draft'};
 assert.equal(JSON.stringify(restoreListingDraft(serializeListingDraft(draft,1000),{},2000)),JSON.stringify(draft));
});
test('expired or unsupported drafts are discarded and transient media never restored',()=>{
 const raw=serializeListingDraft({photos:['blob:temporary','https://example.test/photo.jpg'],video:'blob:temp'},1000);
 const restored=restoreListingDraft(raw,{},2000);assert.equal(restored.photos.length,1);assert.equal(restored.video,undefined);
 assert.equal(JSON.stringify(restoreListingDraft(raw,{},1000+7*86400000)),'{}');
 assert.equal(JSON.stringify(restoreListingDraft('{"version":2,"savedAt":1000,"draft":{"address":"old"}}',{},2000)),'{}');
});
