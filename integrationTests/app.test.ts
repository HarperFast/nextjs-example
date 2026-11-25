// Integration tests for the Harper Next.js example.
//
// Architecture note: this component is served by the `@harperfast/nextjs` plugin,
// which owns the public HTTP port and routes every request to the Next.js app.
// The `Dog` table (schema.graphql) is therefore NOT
// reachable as a REST resource over HTTP here — the Next.js server actions
// (app/actions.js) read and write it through Harper's in-process Resource API
// (`tables.Dog`). To exercise the same data layer from a test, we drive the
// Dog table through the Operations API, and separately assert that the Next.js
// pages render.
//
// These tests boot the full component as a fixture under v5 and verify:
//   1. the component boots and the `Dog` table is defined,
//   2. create / read-by-id / delete on the `Dog` table (Operations API),
//   3. the Next.js HTML routes ("/" and "/dogs") render, and "/dogs" lists a dog
//      inserted into the table, which its server action reads through the
//      `tables` global Harper injects.

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

// The form's action takes no bound arguments, so Next.js renders its id as a hidden `$ACTION_ID_` field, and
// a plain form post runs createDog.
async function submitDogForm(ctx: ContextWithHarper, fields: Record<string, string>) {
	const page = await (await pageFetch(ctx, '/dogs')).text();
	const actionField = /name="(\$ACTION_ID_[^"]+)"/.exec(page)?.[1];
	ok(actionField, 'expected the add-dog form to carry its server action id');
	const form = new FormData();
	form.append(actionField, '');
	for (const [name, value] of Object.entries(fields)) form.append(name, value);
	return fetch(`${ctx.harper.httpURL}/dogs`, {
		method: 'POST',
		headers: { Authorization: authHeader(ctx) },
		body: form,
		redirect: 'manual',
	});
}

async function dogsNamed(ctx: ContextWithHarper, name: string) {
	const dogs = await op<{ name: string; age: number }[]>(ctx, {
		operation: 'search_by_value',
		database: 'data',
		table: 'Dog',
		search_attribute: 'id',
		search_value: '*',
		get_attributes: ['name', 'age'],
	});
	return dogs.filter((dog) => dog.name === name);
}

void suite('Harper Next.js example', (ctx: ContextWithHarper) => {
	before(async () => {
		await setupHarperWithFixture(ctx, FIXTURE_PATH, { harperBinPath });
	});

	after(async () => {
		await teardownHarper(ctx);
	});

	void test('component boots and the Dog table is defined', async () => {
		const desc = await op<{ data: { Dog?: { name: string; primary_key: string; expiration?: string } } }>(ctx, {
			operation: 'describe_all',
		});
		ok(desc.data?.Dog, 'expected a Dog table in the "data" database');
		strictEqual(desc.data.Dog.name, 'Dog');
		strictEqual(desc.data.Dog.primary_key, 'id');
		strictEqual(desc.data.Dog.expiration, '3600s', "visitors' dogs should expire after an hour");
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

	void test('Next.js /dogs page lists a dog from the Dog table', async () => {
		// listDogs() reads the table through the injected `tables` global, and returns no dogs,
		// rather than failing, when that global is missing. So check that a dog put in the
		// table shows up on the page.
		await op(ctx, {
			operation: 'insert',
			database: 'data',
			table: 'Dog',
			records: [{ id: 'dog-2', name: 'Biscuit', breed: 'Beagle', age: 4, color: 'Tan' }],
		});
		const res = await pageFetch(ctx, '/dogs');
		strictEqual(res.status, 200);
		ok((await res.text()).includes('Biscuit'), 'expected /dogs to list the dog inserted into the Dog table');
	});

	void test('the add-dog form accepts an age of 0', async () => {
		const res = await submitDogForm(ctx, { name: 'Pip', breed: 'Corgi', age: '0', color: 'Red' });
		ok(res.status < 400, `expected the form post to succeed, got HTTP ${res.status}`);
		const dogs = await dogsNamed(ctx, 'Pip');
		strictEqual(dogs.length, 1);
		strictEqual(dogs[0].age, 0);
	});

	void test('the add-dog form refuses an age that is not a whole number from 0 to 99', async () => {
		for (const [name, age] of [
			['Minus', '-1'],
			['Blank', '   '],
			['Half', '1.5'],
			['Exponent', '1e1'],
			['Hundred', '100'],
		]) {
			const res = await submitDogForm(ctx, { name, breed: 'Corgi', age, color: 'Red' });
			ok(res.status >= 400, `expected age ${JSON.stringify(age)} to be refused, got HTTP ${res.status}`);
			deepStrictEqual(await dogsNamed(ctx, name), []);
		}
	});

	void test('the add-dog form stores names, breeds and colors as tidied words', async () => {
		const res = await submitDogForm(ctx, {
			name: "  Zoë   O'Malley-Smith ",
			breed: 'Jack Russell Terrier',
			age: ' 2 ',
			color: 'Brown, white',
		});
		ok(res.status < 400, `expected the form post to succeed, got HTTP ${res.status}`);
		const dogs = await dogsNamed(ctx, "Zoë O'Malley-Smith");
		strictEqual(dogs.length, 1);
	});

	void test('the add-dog form refuses links and other text that is not words', async () => {
		for (const [name, field, value] of [
			['Linky', 'name', 'example.com'],
			['Linky', 'name', 'https://dogs.example'],
			['Spammy', 'breed', 'Visit www.dogs.com'],
			['Droid', 'color', 'R2D2'],
			['Dashy', 'name', 'Rover-'],
		]) {
			const fields = { name, breed: 'Corgi', age: '3', color: 'Red', [field]: value };
			const res = await submitDogForm(ctx, fields);
			ok(res.status >= 400, `expected ${field} ${JSON.stringify(value)} to be refused, got HTTP ${res.status}`);
			deepStrictEqual(await dogsNamed(ctx, fields.name), []);
		}
	});

	void test('the add-dog form measures a name as typed, as the input pattern does, and stores it in NFC', async () => {
		// NFC turns each U+0958 into two code points and composes each e + U+0301 into one.
		const lengthens = '\u0958'.repeat(21);
		let res = await submitDogForm(ctx, { name: lengthens, breed: 'Corgi', age: '3', color: 'Red' });
		ok(res.status < 400, `expected 21 typed letters to be accepted, got HTTP ${res.status}`);
		strictEqual((await dogsNamed(ctx, lengthens.normalize('NFC'))).length, 1);

		const shortens = 'e\u0301'.repeat(21);
		res = await submitDogForm(ctx, { name: shortens, breed: 'Corgi', age: '3', color: 'Red' });
		ok(res.status >= 400, `expected 42 typed code points to be refused, got HTTP ${res.status}`);
		deepStrictEqual(await dogsNamed(ctx, shortens.normalize('NFC')), []);
	});
});
