module.exports = {
  default: [
    '--require-module ts-node/register',
    '--require step_definitions/**/*.js',
  ].join(' '),
}
