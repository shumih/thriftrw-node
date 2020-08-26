const globals = require("rollup-plugin-node-globals");
const builtins = require("rollup-plugin-node-builtins");
const resolve = require("rollup-plugin-node-resolve");
const replace = require("@rollup/plugin-replace");
const commonjs = require("rollup-plugin-commonjs");
const { uglify } = require("rollup-plugin-uglify");

export default {
  input: "./index.js",
  output: {
    file: "./dist/bundle.min.js",
    format: "cjs",
  },
  plugins: [
    globals(),
    builtins(),
    resolve(),
    commonjs({
      exclude: "test/**",
    }),
    uglify(),
    replace({
      "Object.freeze({__proto__:null})": "bufrw",
    }),
  ],
};
