//import dts from 'rollup-plugin-dts'
import json from '@rollup/plugin-json'

// rollup.config.mjs
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript'

export default {
  input: 'src/index.ts', // replace with your entry file
  output: [
    {
      file: 'dist/thumbmark.cjs.js',
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: 'dist/thumbmark.esm.js',
      format: 'esm',
      sourcemap: true,
    },
    {
      file: 'dist/thumbmark.umd.js',
      format: 'umd',
      sourcemap: true,
      name: 'ThumbmarkJS',
    },
  ],
  plugins: [
    resolve(), // so Rollup can find `ms`
    commonjs(), // so Rollup can convert `ms` to an ES module
    typescript(),
    json(),
    terser() // minify, but only in production
  ]
};