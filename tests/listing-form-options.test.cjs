const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, imports) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext(code, {exports, require: name => imports[name] ?? require(name), Intl, console});
  return exports;
}
const numbers=load('lib/listing-numbers.ts',{});
const validation=load('lib/listing-detail-validation.ts',{'./listing-numbers':numbers});
const Form=load('components/listing/ListingForm.tsx',{
  '@/lib/listing-numbers':numbers,
  '@/lib/listing-detail-validation':validation,
  '@/app/context/LanguageContext':{useLanguage:()=>({lang:'id'})},
  '@/components/ui/TetamoSelect':{TetamoSelect:({options=[]})=>React.createElement('select',null,options.map(o=>React.createElement('option',{key:o.value,value:o.value},o.label)))}
}).default;
function render(type){return renderToStaticMarkup(React.createElement(Form,{draft:{listingType:'disewa',propertyType:type,rentalType:'harian'},setDraft:()=>{},isValid:false,onBack:()=>{},onNext:()=>{}}));}
test('Room offers daily rent, furnishing and private/shared facilities without land area',()=>{
 const html=render('room');
 for(const text of ['Harian','Kulkas','Mesin Cuci','Seprai','Kamar Mandi Pribadi','Kamar Mandi Bersama','Dapur Bersama'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('Luas Tanah'));
});
test('Land has utilities and access without appliances or furnishing',()=>{
 const html=render('tanah');
 assert.ok(html.includes('Sambungan Listrik'));assert.ok(html.includes('Drainase'));
 assert.ok(!html.includes('Kulkas'));assert.ok(!html.includes('Tanpa Furnitur'));
});
test('Industrial facilities omit household appliances and household living areas',()=>{
 const html=render('gudang');assert.ok(html.includes('Loading Dock'));assert.ok(!html.includes('Kulkas'));assert.ok(!html.includes('Ruang Tamu'));
});
test('Apartment includes appliances and unit facilities; nearby transport choices exist',()=>{
 const html=render('apartemen');for(const text of ['Kulkas','Kartu Akses','Halte Bus','Tempat Ibadah'])assert.ok(html.includes(text),text);
});
test('leasehold requires duration, current expiry and extension; measurements cannot silently change value',()=>{
 const base={propertyType:'tanah',listingType:'dijual',saleType:'leasehold',price:'1000000',lt:'1,2',landUnit:'are',leaseYears:'30',leaseUntilYear:'2056',leaseExtendable:'ya'};
 assert.equal(validation.listingDetailIssue(base,2026),null);
 assert.equal(validation.listingDetailIssue({...base,leaseYears:''},2026),'lease');
 assert.equal(validation.listingDetailIssue({...base,leaseUntilYear:'2020'},2026),'lease');
 assert.equal(validation.listingDetailIssue({...base,lt:'-1,2'},2026),'measurement');
 assert.equal(numbers.parseListingDecimal(numbers.decimalInput('-1,2')),null);
});
test('daily Room rent can proceed without land and zero prices cannot proceed',()=>{
 const base={propertyType:'room',listingType:'disewa',rentalType:'harian',rentPrice:'500000',lb:'12,5'};
 assert.equal(validation.listingDetailIssue(base),null);
 assert.equal(validation.listingDetailIssue({...base,rentPrice:'0'}),'price');
 assert.equal(validation.listingDetailIssue({...base,lb:'12,5,6'}),'measurement');
});

test("review: alphabetical types, appliances above facilities and apartment courts",()=>{const html=render("apartemen");const options=[...html.matchAll(/<option[^>]*>([^<]+)<\/option>/g)].map(m=>m[1]);assert.ok(options.indexOf("Apartemen")<options.indexOf("Rumah"));assert.ok(html.indexOf("Peralatan &amp; Perlengkapan Hunian")<html.indexOf(">Fasilitas<"));for(const label of ["Lapangan Tenis","Lapangan Basket","Lapangan Squash","Lapangan Padel","Lapangan Bulu Tangkis"])assert.ok(html.includes(label),label);});
