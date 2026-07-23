import { pathToFileURL } from 'node:url';

let serverOnlyEmptyPath;

export function initialize(data) {
  serverOnlyEmptyPath = data.serverOnlyEmptyPath;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') {
    return {
      shortCircuit: true,
      url: pathToFileURL(serverOnlyEmptyPath).href,
    };
  }

  return nextResolve(specifier, context);
}
