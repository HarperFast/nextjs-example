import next from 'eslint-config-next';

const eslintConfig = [
	...next,
	{
		// `tables` and `transaction` are globals injected by the Harper runtime for server-side code.
		languageOptions: {
			globals: {
				tables: 'readonly',
				transaction: 'readonly',
			},
		},
	},
	{
		ignores: ['.next/', 'node_modules/'],
	},
];

export default eslintConfig;
