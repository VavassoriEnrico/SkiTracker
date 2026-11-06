import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function client(fetch) {
  const source = readFileSync(new URL('../src/api/client.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, fetch, AbortController, FormData, setTimeout, clearTimeout,
    process: { env: {} }, console,
    require: name => {
      if (name === 'expo-constants') return { default: { expoConfig: { hostUri: '127.0.0.1:8081' } } };
      if (name === '../lib/supabase') return { supabase: { auth: { getSession: async () => ({
        data: { session: { access_token: 'test-token' } }, error: null,
      }) } } };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return module.exports;
}

test('API timeout stays active while reading the JSON response', { timeout: 1000 }, async () => {
  let signal;
  const api = client(async (_url, options) => {
    signal = options.signal;
    return { status: 200, ok: true, json: () => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true });
    }) };
  });
  await assert.rejects(api.request('/ski_videos', 'GET', undefined, 10), /timed out/);
  assert.equal(signal.aborted, true);
});

test('API preserves the backend error message', async () => {
  const api = client(async () => ({ status: 503, ok: false, json: async () => ({ detail: 'Storage unavailable' }) }));
  await assert.rejects(api.request('/ski_videos/1/analyze', 'POST'), /Storage unavailable/);
});

test('successful DELETE does not try to parse an empty response', async () => {
  const api = client(async () => ({ status: 204, ok: true, json: () => { throw new Error('Empty response'); } }));
  assert.equal(await api.request('/ski_videos/1', 'DELETE'), undefined);
});
