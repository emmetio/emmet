import typescript from '@rollup/plugin-typescript';

export default {
    input: './src/index.ts',
    external: ['@emmetio/scanner'],
    plugins: [typescript()],
    output: [{
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
        file: './dist/index.cjs'
    }, {
        format: 'es',
        sourcemap: true,
        file: './dist/index.js'
    }]
};
