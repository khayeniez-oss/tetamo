const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const out = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/listing-numbers.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS }}).outputText, { exports: out.exports });
const { decimalInput, parseListingDecimal, landAreaInSqm } = out.exports;

test('decimal commas and dots preserve the represented measurement', () => {
  for (const [input, expected] of [['1,2',1.2],['1.2',1.2],['0,25',0.25],['1.234,56',1234.56],['1,234.56',1234.56],['1.234.567',1234567],['1234,56',1234.56]]) assert.equal(parseListingDecimal(input), expected, input);
  assert.equal(decimalInput('1,2'), '1,2');
  assert.equal(decimalInput('1,'), '1,');
});
test('area conversion uses the original unit without inflating decimal values', () => {
  assert.equal(landAreaInSqm('1,2','are'),120);
  assert.equal(landAreaInSqm('1,2','hectare'),12000);
  assert.equal(landAreaInSqm('1.2','m2'),1.2);
});
test('malformed or negative measurements are not silently converted into another value', () => {
  for (const input of ['',null,undefined,'1,2,3','-1,2','abc','Infinity',-2,Infinity]) assert.equal(parseListingDecimal(input),null,String(input));
});
