import typescript from 'rollup-plugin-typescript2';

export default {
    input: './src/Node.ts',
    plugins: [typescript({
        tsconfigOverride: {
            compilerOptions: { module: 'esnext' }
        }
    })],
    output: [{
        format: 'cjs',
        file: './dist/node.cjs.js',
        sourcemap: true,
        exports: 'named'
    }, {
        format: 'es',
        file: './dist/node.es.js',
        sourcemap: true
    }]
};
