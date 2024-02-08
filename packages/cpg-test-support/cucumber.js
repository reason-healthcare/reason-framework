module.exports = {
  default: [
    "--require-module ts-node/register",
    "--require features/**/*.js"
  ].join(" "),
};
