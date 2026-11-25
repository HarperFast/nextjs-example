// Anyone can add a dog to this public example, so each text field must read as a few words and never as
// a link: words of letters joined by single spaces (a comma may end a word, and so may a period, as in
// "Mr. Biscuits"), with apostrophes and hyphens inside words. That leaves no room for `:`, `/`, `@`,
// digits, or a period inside a word, so `example.com` and `https://…` are refused.
//
// The form's inputs use the same patterns: a browser compiles `pattern` with the `v` flag and anchors it
// to the whole value, as `matches` does here.
const WORD = "\\p{L}[\\p{L}\\p{M}'’\\-]*[.,]?";
export const WORDS_PATTERN = `${WORD}(?: ${WORD})*`;
export const AGE_PATTERN = '[0-9]{1,2}';

export const TEXT_FIELDS = {
	name: { label: 'Name', maxLength: 40 },
	breed: { label: 'Breed', maxLength: 60 },
	color: { label: 'Color', maxLength: 40 },
};

const matches = (pattern, value) => new RegExp(`^(?:${pattern})$`, 'v').test(value);

/** Reads and checks the add-dog form, returning the record to store. Throws on the first bad field. */
export function parseDogForm(formData) {
	const dog = {};
	for (const [field, { label, maxLength }] of Object.entries(TEXT_FIELDS)) {
		// Spacing a person can't see is not worth refusing for.
		const value = String(formData.get(field) ?? '')
			.normalize('NFC')
			.trim()
			.replace(/\s+/g, ' ');
		if (!value) {
			throw new Error('All fields are required');
		}
		if (value.length > maxLength || !matches(WORDS_PATTERN, value)) {
			throw new Error(`${label} must be words made of letters, up to ${maxLength} characters, with no links`);
		}
		dog[field] = value;
	}
	const age = String(formData.get('age') ?? '');
	if (!age) {
		throw new Error('All fields are required');
	}
	if (!matches(AGE_PATTERN, age)) {
		throw new Error('Age must be a whole number of years from 0 to 99');
	}
	dog.age = Number(age);
	return dog;
}
