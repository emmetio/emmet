import typescript from '@rollup/plugin-typescript';

export default {
    input: './src/scanner.ts',
    plugins: [typescript()],
    output: [{
        format: 'cjs',
        exports: 'named',
        sourcemap: true,
        file: './scanner.cjs.js'
    }, {
        format: 'es',
        sourcemap: true,
        file: './scanner.js'
    }]
};
