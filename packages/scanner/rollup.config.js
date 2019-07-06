import typescript from 'rollup-plugin-typescript2';

export default {
    input: './src/index.ts',
    plugins: [typescript({
        tsconfigOverride: {
            compilerOptions: { module: 'esnext' }
        }
    })],
    output: [{
        format: 'cjs',
        exports: 'named',
        sourcemap: true,
        file: './scanner.js'
    }, {
        format: 'es',
        sourcemap: true,
        file: './scanner.es.js'
    }]
};
