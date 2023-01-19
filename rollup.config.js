import { extname } from 'path';
import typescript from '@rollup/plugin-typescript';

export default {
    input: './src/index.ts',
    external: id => /@emmetio\//.test(id),
    plugins: [json(), typescript()],
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

function json() {
    return {
        transform(code, id) {
            if (extname(id) === '.json') {
                return { code: `export default ${code}`, map: null };
            }
        }
    };
}
