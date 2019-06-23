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
        file: './dist/snippets-registry.cjs.js',
        sourcemap: true,
        exports: 'named'
    }, {
        format: 'es',
        file: './dist/snippets-registry.es.js',
        sourcemap: true
    }]
};
