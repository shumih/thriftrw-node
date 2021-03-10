const globals = require("rollup-plugin-node-globals");
const builtins = require("rollup-plugin-node-builtins");
const resolve = require("rollup-plugin-node-resolve");
const replace = require("@rollup/plugin-replace");
const commonjs = require("rollup-plugin-commonjs");
const { uglify } = require("rollup-plugin-uglify");

export default {
  external: ["@shumih/bufrw"],
  input: "./index.js",
  output: {
    file: "./dist/bundle.min.js",
    format: "cjs",
    exports: "named",
  },
  plugins: [
    globals({}),
    builtins(),
    resolve(),
    commonjs({
      exclude: "test/**",
    }),
    uglify(),
  ],
};
