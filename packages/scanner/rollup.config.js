import typescript from '@rollup/plugin-typescript';

export default {
    input: './src/scanner.ts',
    plugins: [typescript()],
    output: [{
        format: 'cjs',
        exports: 'named',
        sourcemap: true,
        file: './dist/scanner.cjs'
    }, {
        format: 'es',
        sourcemap: true,
        file: './dist/scanner.js'
    }]
};
