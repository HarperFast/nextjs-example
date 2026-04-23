'use server';

import { revalidatePath } from 'next/cache';
import('harper');

export async function listDogs() {
	// Original database logic - uncomment when ready
	try {
		const dogs = [];
		if (tables?.Dog) {
			for await (const dog of tables.Dog.search()) {
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
		if (typeof tables === 'undefined' || !tables.Dog) {
			return null;
		}
		return await tables.Dog.get(id);
	} catch (error) {
		console.error('Error getting dog:', error);
		return null;
	}
}

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

	if (typeof tables === 'undefined' || !tables.Dog) {
		throw new Error('Database not available');
	}

	await tables.Dog.create({ name, breed, age, color });

	// Revalidate the dogs page to show updated data
	revalidatePath('/dogs');
}

export async function deleteDog(dogId) {
	console.log('Deleting dog with id:', dogId);

	if (typeof tables === 'undefined' || !tables.Dog) {
		throw new Error('Database not available');
	}

	await tables.Dog.delete(dogId);

	// Revalidate the dogs page to show updated data
	revalidatePath('/dogs');
}
