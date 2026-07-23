import Module from 'node:module';
import path from 'node:path';
import { createRequire, register } from 'node:module';

const require = createRequire(import.meta.url);
const serverOnlyIndexPath = require.resolve('server-only');
const serverOnlyEmptyPath = path.join(path.dirname(serverOnlyIndexPath), 'empty.js');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveServerOnlyForPilotCli(request, parent, isMain, options) {
  if (request === 'server-only') {
    return serverOnlyEmptyPath;
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

register(new URL('./server-only-loader.mjs', import.meta.url), {
  data: {
    serverOnlyEmptyPath,
  },
});
