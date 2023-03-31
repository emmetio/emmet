import { extname } from 'path';
import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';

export default {
    input: './src/index.ts',
    plugins: [nodeResolve(), json(), typescript()],
    output: [{
        file: './dist/emmet.es.js',
        format: 'es',
        sourcemap: true
    }, {
        file: './dist/emmet.cjs',
        format: 'cjs',
        exports: 'named',
        sourcemap: true
    }]
};

function json() {
    return {
        transform(code, id) {
            if (extname(id) === '.json') {
                return { code: `export default ${code}`, map: null };
            }
        }
    };
}
