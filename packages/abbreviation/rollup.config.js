import typescript from 'rollup-plugin-typescript2';
import resolve from 'rollup-plugin-node-resolve';

export default {
    input: './src/index.ts',
    plugins: [resolve(), typescript({
        tsconfigOverride: {
            compilerOptions: { module: 'esnext' }
        }
    })],
    
    output: [{
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
        file: './dist/abbreviation.cjs.js'
    }, {
        format: 'es',
        sourcemap: true,
        file: './dist/abbreviation.es.js'
    }]
};
