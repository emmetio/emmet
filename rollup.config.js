import typescript from 'rollup-plugin-typescript2';
import nodeResolve from 'rollup-plugin-node-resolve';
import json from 'rollup-plugin-json';

export default {
    input: './src/index.ts',
    plugins: [nodeResolve(), json(), typescript({
        tsconfigOverride: {
            compilerOptions: { module: 'esnext' }
        }
    })],
    output: [{
        file: './dist/emmet.es.js',
        format: 'es',
        sourcemap: true
    }, {
        file: './dist/emmet.cjs.js',
        format: 'cjs',
        exports: 'named',
        sourcemap: true
    }]
};
