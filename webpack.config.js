const path = require("path");
const webpack = require("webpack");

const ROOT = path.resolve(__dirname, "src");
const DESTINATION = path.resolve(__dirname, "dist");

module.exports = {
  context: ROOT,
  entry: {
    main: "./main.ts"
  },
  output: {
    filename: "[name].bundle.js",
    path: DESTINATION
  },
  resolve: {
    extensions: [".ts", ".js"],
    modules: [ROOT, "node_modules"]
  },
  mode: 'development',
  module: {
    rules: [
      {
        enforce: "pre",
        test: /\.js$/,
        use: "source-map-loader"
      },
      {
        enforce: "pre",
        test: /\.ts$/,
        exclude: /node_modules/,
        use: "tslint-loader"
      },
      {
        test: /\.ts$/,
        exclude: [/node_modules/],
        use: "awesome-typescript-loader"
      },
      {
        test: /\.css$/,
        exclude: [/node_modules/],
        use: ['style-loader', 'css-loader'],
      },
    ]
  },

  devtool: "cheap-module-source-map",
  devServer: {}
};
