import typescript from 'rollup-plugin-typescript2';

export default {
    input: './index.ts',
    plugins: [typescript({
        tsconfigOverride: {
            compilerOptions: { module: 'esnext' }
        }
    })],
    output: [{
        format: 'cjs',
        file: 'dist/output-profile.cjs.js',
        sourcemap: true,
        exports: 'named'
    }, {
        format: 'es',
        file: 'dist/output-profile.es.js',
        sourcemap: true
    }]
};
