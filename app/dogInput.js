// The input patterns compile under `u` and `v` (browsers use either) and allow the spacing the server
// tidies away before its stricter check.

// A letter, but not one of the Hangul fillers, which render as blank.
const LETTER = '(?![\\u115F\\u1160\\u3164\\uFFA0])\\p{L}\\p{M}*';
const WORD = `${LETTER}(?:['’\\-]?${LETTER})*[.,]?`;
const WORDS = `${WORD}(?: ${WORD})*`;
const AGE = '[0-9]{1,2}';

const WORDS_INPUT = `\\s*${WORD}(?:\\s+${WORD})*\\s*`;
export const AGE_INPUT_PATTERN = `\\s*${AGE}\\s*`;

const TEXT_FIELDS = {
	name: { label: 'Name', maxLength: 40 },
	breed: { label: 'Breed', maxLength: 60 },
	color: { label: 'Color', maxLength: 40 },
};

const wordsRegExp = new RegExp(`^(?:${WORDS})$`, 'v');
const ageRegExp = new RegExp(`^(?:${AGE})$`, 'v');
// Room for the spaces the browser lets through, while refusing an oversized post before any work on it.
export const RAW_LENGTH_LIMIT = 200;
const TEXT_FIELD_ENTRIES = Object.entries(TEXT_FIELDS);

// Bounds the length the server measures after tidying, where a run of spaces counts as one.
export function wordsInputPattern(field) {
	return `(?=\\s*(?:\\S|\\s+(?=\\S)){1,${TEXT_FIELDS[field].maxLength}}\\s*$)${WORDS_INPUT}`;
}

function tidy(formData, field) {
	const raw = String(formData.get(field) ?? '');
	return raw.length > RAW_LENGTH_LIMIT ? null : raw.normalize('NFC').trim().replace(/\s+/g, ' ');
}

export function parseDogForm(formData) {
	const dog = {};
	for (const [field, { label, maxLength }] of TEXT_FIELD_ENTRIES) {
		const value = tidy(formData, field);
		if (value === '') {
			throw new Error('All fields are required');
		}
		// Code points, as the input pattern counts them.
		if (value === null || [...value].length > maxLength || !wordsRegExp.test(value)) {
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
