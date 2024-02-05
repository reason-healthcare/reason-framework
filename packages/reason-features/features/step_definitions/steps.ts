const assert = require('assert')
const { Given, When, Then } = require('@cucumber/cucumber')

interface Identifier {
  id: string;
  recommended: string;
}

Given('{string} is loaded', function (this: Identifier, id: string) {
  this.id = id;
});

Then('{string} should have been recommended', function (this: Identifier, recommended: string) {
  assert.equal(this.id, recommended)
});
