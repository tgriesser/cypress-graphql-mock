const fs = require("fs");
const path = require("path");
const wp = require("@cypress/webpack-preprocessor");

const webpackOptions = {
  watch: true,
  resolve: {
    extensions: [".ts", ".js", ".mjs"]
  },
  module: {
    rules: [
      {
        test: /\.mjs$/,
        include: /node_modules/,
        type: "javascript/auto"
      },
      {
        test: /\.ts$/,
        exclude: [/node_modules/],
        use: [
          {
            loader: "ts-loader",
            options: {
              transpileOnly: true
            }
          }
        ]
      }
    ]
  }
};

module.exports = (on, config) => {
  on("task", {
    getSchema() {
      return fs.readFileSync(
        path.resolve(__dirname, "../test-schema.graphql"),
        "utf8"
      );
    }
  });

  on("file:preprocessor", wp({ webpackOptions }));
};
