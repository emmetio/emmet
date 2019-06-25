export default {
	input: './index.js',
	external: [
		'@emmetio/stream-reader',
		'@emmetio/stream-reader-utils',
		'@emmetio/node'
	],
	output: [
		{ format: 'cjs', file: 'dist/css-abbreviation.cjs.js' },
		{ format: 'es',  file: 'dist/css-abbreviation.es.js' }
	]
};
