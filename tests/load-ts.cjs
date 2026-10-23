const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
module.exports = function makeLoader(mocks = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const mod = new Module(file, module);
    cache.set(file, mod);
    mod.filename = file;
    mod.paths = Module._nodeModulePaths(path.dirname(file));
    const originalRequire = mod.require.bind(mod);
    mod.require = (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      const target = name.startsWith('@/') ? path.join(process.cwd(), name.slice(2)) : name.startsWith('.') ? path.resolve(path.dirname(file), name) : null;
      if (target) {
        for (const suffix of ['', '.ts', '.tsx']) {
          if (fs.existsSync(target + suffix) && fs.statSync(target + suffix).isFile()) return load(target + suffix);
        }
      }
      return originalRequire(name);
    };
    const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    });
    mod._compile(output.outputText, file);
    return mod.exports;
  }
  return load;
};
