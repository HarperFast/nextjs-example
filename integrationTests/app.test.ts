// Integration tests for the Harper Next.js example.
//
// Architecture note: this component is served by the `@harperfast/nextjs` plugin,
// which owns the public HTTP port and routes every request to the Next.js app.
// The `Dog` table (schema.graphql: `type Dog @table @export`) is therefore NOT
// reachable as a REST resource over HTTP here — the Next.js server actions
// (app/actions.js) read and write it through Harper's in-process Resource API
// (`tables.Dog`). To exercise the same data layer from a test, we drive the
// Dog table through the Operations API, and separately assert that the Next.js
// pages render.
//
// These tests boot the full component as a fixture under v5 and verify:
//   1. the component boots and the `Dog` table is defined,
//   2. create / read-by-id / delete on the `Dog` table (Operations API),
//   3. the Next.js HTML routes ("/" and "/dogs") render.

import { suite, test, before, after } from 'node:test';
import { strictEqual, ok, deepStrictEqual } from 'node:assert/strict';
import { setupHarperWithFixture, teardownHarper, type ContextWithHarper } from '@harperfast/integration-testing';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = resolve(__dirname, '..');

// The `harper` package's `exports` map only exposes ".", so the harness's
// auto-resolution of 'harper/dist/bin/harper.js' fails with ERR_PACKAGE_PATH_NOT_EXPORTED.
// Resolve the CLI from the (exported) main entry and pass it explicitly.
const require = createRequire(import.meta.url);
const harperBinPath = resolve(dirname(require.resolve('harper')), 'bin/harper.js');

function authHeader(ctx: ContextWithHarper): string {
	const creds = Buffer.from(`${ctx.harper.admin.username}:${ctx.harper.admin.password}`).toString('base64');
	return `Basic ${creds}`;
}

// Drive the Harper data layer (the same layer the Next.js server actions use)
// through the Operations API, since the HTTP port is owned by the Next.js plugin.
async function op<T = unknown>(ctx: ContextWithHarper, operation: Record<string, unknown>): Promise<T> {
	const res = await fetch(ctx.harper.operationsAPIURL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', 'Authorization': authHeader(ctx) },
		body: JSON.stringify(operation),
	});
	ok(res.ok, `operation ${String(operation.operation)} failed with HTTP ${res.status}`);
	return (await res.json()) as T;
}

function pageFetch(ctx: ContextWithHarper, path: string) {
	return fetch(`${ctx.harper.httpURL}${path}`, { headers: { Authorization: authHeader(ctx) } });
}

void suite('Harper Next.js example', (ctx: ContextWithHarper) => {
	before(async () => {
		await setupHarperWithFixture(ctx, FIXTURE_PATH, { harperBinPath });
	});

	after(async () => {
		await teardownHarper(ctx);
	});

	void test('component boots and the Dog table is defined', async () => {
		const desc = await op<{ data: { Dog?: { name: string; primary_key: string } } }>(ctx, {
			operation: 'describe_all',
		});
		ok(desc.data?.Dog, 'expected a Dog table in the "data" database');
		strictEqual(desc.data.Dog.name, 'Dog');
		strictEqual(desc.data.Dog.primary_key, 'id');
	});

	void test('insert, read-by-id, and delete a Dog (Resource API via Operations API)', async () => {
		await op(ctx, {
			operation: 'insert',
			database: 'data',
			table: 'Dog',
			records: [{ id: 'dog-1', name: 'Buddy', breed: 'Dalmatian', age: 3, color: 'Black and White' }],
		});

		const got = await op<{ id: string; name: string; breed: string; age: number }[]>(ctx, {
			operation: 'search_by_id',
			database: 'data',
			table: 'Dog',
			ids: ['dog-1'],
			get_attributes: ['id', 'name', 'breed', 'age', 'color'],
		});
		strictEqual(got.length, 1);
		strictEqual(got[0].name, 'Buddy');
		strictEqual(got[0].breed, 'Dalmatian');
		strictEqual(got[0].age, 3);

		await op(ctx, { operation: 'delete', database: 'data', table: 'Dog', ids: ['dog-1'] });

		const afterDelete = await op<unknown[]>(ctx, {
			operation: 'search_by_id',
			database: 'data',
			table: 'Dog',
			ids: ['dog-1'],
			get_attributes: ['id'],
		});
		deepStrictEqual(afterDelete, []);
	});

	void test('Next.js home page renders', async () => {
		const res = await pageFetch(ctx, '/');
		strictEqual(res.status, 200);
		ok((res.headers.get('content-type') ?? '').includes('text/html'), 'expected an HTML response');
		const html = await res.text();
		ok(html.includes('Doggy Management System'), 'expected the home page heading');
	});

	void test('Next.js /dogs page renders', async () => {
		const res = await pageFetch(ctx, '/dogs');
		strictEqual(res.status, 200);
		ok((res.headers.get('content-type') ?? '').includes('text/html'), 'expected an HTML response');
	});
});
