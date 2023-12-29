const path = require('path');
//const webpack = require('webpack');
//const tsLoader = require('ts-loader');

module.exports = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  }, 
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'ThumbMark.js',
    path: path.resolve(__dirname, 'build'),
    //module: 'esnext',
    library: {
      name: 'ThumbMarkJS',
      type: 'umd'
    }
  },
  optimization: {
    minimize: true
  }
};