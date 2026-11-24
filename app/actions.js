'use server';

/* global tables */
import { revalidatePath } from 'next/cache';

// Server actions run *inside* Harper, so they read and write tables directly through the injected
// globals — no separate API and no network round-trip. Harper provides `tables` (and `transaction`),
// so use them directly; do NOT add a top-level `import 'harper'` — that import runs during the
// Next.js production build and conflicts with the running database.
//
// The globals exist only while Harper runs the app: `next build`, or `next dev` outside Harper, has
// no `tables`, so each action checks for the table first.
function dogTable() {
	return typeof tables === 'undefined' ? undefined : tables.Dog;
}

export async function listDogs() {
	try {
		const Dog = dogTable();
		const dogs = [];
		if (Dog) {
			for await (const dog of Dog.search()) {
				// Copy into a plain object, which is what a server component can pass on to a client one.
				dogs.push({ id: dog.id, name: dog.name, breed: dog.breed, age: dog.age, color: dog.color });
			}
		}
		return dogs;
	} catch (error) {
		console.error('Error listing dogs:', error);
		return [];
	}
}

export async function getDog(id) {
	try {
		const Dog = dogTable();
		if (!Dog) {
			return null;
		}
		return await Dog.get(id);
	} catch (error) {
		console.error('Error getting dog:', error);
		return null;
	}
}

// Any server action a client can reach is a public endpoint. This example lets anyone add and delete
// dogs; add your own authorization checks before shipping mutations that matter.
export async function createDog(formData) {
	// Extract form values
	const name = formData.get('name');
	const breed = formData.get('breed');
	const age = parseInt(formData.get('age'));
	const color = formData.get('color');

	// Validate required fields
	if (!name || !breed || !age || !color) {
		throw new Error('All fields are required');
	}

	const Dog = dogTable();
	if (!Dog) {
		throw new Error('Database not available');
	}

	await Dog.create({ name, breed, age, color });

	// Revalidate the dogs page to show updated data
	revalidatePath('/dogs');
}

export async function deleteDog(dogId) {
	console.log('Deleting dog with id:', dogId);

	const Dog = dogTable();
	if (!Dog) {
		throw new Error('Database not available');
	}

	await Dog.delete(dogId);

	// Revalidate the dogs page to show updated data
	revalidatePath('/dogs');
}
