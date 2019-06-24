import typescript from 'rollup-plugin-typescript2';

export default {
    input: './src/index.ts',
    plugins: [typescript({
        tsconfigOverride: {
            compilerOptions: { module: 'esnext' }
        }
    })],
	external: [
		'@emmetio/stream-reader',
		'@emmetio/stream-reader/utils',
		'@emmetio/node'
	],
	output: [{
		format: 'cjs',
		sourcemap: true,
		file: './dist/abbreviation.cjs.js'
	}, {
		format: 'es',
		sourcemap: true,
		file: './dist/abbreviation.es.js'
	}]
};
