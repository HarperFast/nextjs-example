// Anyone can add a dog to this public example, so the text fields take words and never links. The
// `*_INPUT_PATTERN`s go on the form's inputs, where a browser tests the raw value with the `v` flag, so
// they allow the surrounding and repeated spaces the server tidies away before its stricter check.

// A letter, but not one of the Hangul fillers, which render as blank.
const LETTER = '[\\p{L}--[\\u115F\\u1160\\u3164\\uFFA0]]\\p{M}*';
// Apostrophes and hyphens only join letters; a comma or period may end a word, as in "Mr. Biscuits".
const WORD = `${LETTER}(?:['’\\-]?${LETTER})*[.,]?`;
const WORDS = `${WORD}(?: ${WORD})*`;
const AGE = '[0-9]{1,2}';

export const WORDS_INPUT_PATTERN = `\\s*${WORD}(?:\\s+${WORD})*\\s*`;
export const AGE_INPUT_PATTERN = `\\s*${AGE}\\s*`;

export const TEXT_FIELDS = {
	name: { label: 'Name', maxLength: 40 },
	breed: { label: 'Breed', maxLength: 60 },
	color: { label: 'Color', maxLength: 40 },
};

const wordsRegExp = new RegExp(`^(?:${WORDS})$`, 'v');
const ageRegExp = new RegExp(`^(?:${AGE})$`, 'v');
// Room for the spaces the browser lets through, while refusing an oversized post before any work on it.
const RAW_LENGTH_LIMIT = 200;

function tidy(formData, field) {
	const raw = String(formData.get(field) ?? '');
	return raw.length > RAW_LENGTH_LIMIT ? null : raw.normalize('NFC').trim().replace(/\s+/g, ' ');
}

export function parseDogForm(formData) {
	const dog = {};
	for (const [field, { label, maxLength }] of Object.entries(TEXT_FIELDS)) {
		const value = tidy(formData, field);
		if (value === '') {
			throw new Error('All fields are required');
		}
		if (value === null || value.length > maxLength || !wordsRegExp.test(value)) {
			throw new Error(`${label} must be words made of letters, up to ${maxLength} characters, with no links`);
		}
		dog[field] = value;
	}
	const age = tidy(formData, 'age');
	if (age === '') {
		throw new Error('All fields are required');
	}
	if (age === null || !ageRegExp.test(age)) {
		throw new Error('Age must be a whole number of years from 0 to 99');
	}
	dog.age = Number(age);
	return dog;
}
