import typescript from '@rollup/plugin-typescript';

/** @type {import('rollup').RollupOptions} */
export default {
    input: './src/index.ts',
    external: ['@emmetio/scanner'],
    plugins: [typescript()],
    output: [{
        format: 'cjs',
        file: 'dist/index.cjs.js',
        sourcemap: true,
        exports: 'named',
    }, {
        format: 'es',
        file: 'dist/index.js',
        sourcemap: true,
    }]
};
