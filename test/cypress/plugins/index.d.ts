declare namespace Cypress {
  interface Chainable {
    task(name: "getSchema"): Chainable<string>;
  }
}
