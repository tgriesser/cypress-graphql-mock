# cypress-graphql-mock

Adds commands for executing a mocked GraphQL server using only the client

## Installation

`npm install cypress-graphql-mock`

in Cypress' `commands.js` add:

```js
import 'cypress-graphql-mock';
```


## Instructions

Adds `.mockGraphql()` and `.mockGraphqlOps()` methods to the cypress chain.

The `.mockGraphql` should be called in the Cypress `before` or `beforeEach` block
config to setup the server. This method takes a schema, either in the form of one or more SDL files, or as the JSON result of an introspection query.

```ts
const schema = fs.readFileSync('../../app-schema.graphql', 'utf8');
// alternatively, using a dumped introspection query:
// const schema = require('../../dumped-schema.json')

beforeEach(() => {
  cy.server();
  cy.mockGraphql({ schema });
});
```

By default, it will use the `/graphql` endpoint, but this can be changed
depending on the expected server implementation.

```ts
beforeEach(() => {
  cy.server();
  cy.mockGraphql({
    schema,
    endpoint: '/gql'
  });
});
```

It takes an "operations" object, representing the named operations
of the GraphQL server. This is combined with the "mocks" option,
to modify the output behavior per test.

The `.mockGraphqlOps()` allows you to configure the mock responses at a
more granular level

For example, if we has a query called "UserQuery" and wanted to
explicitly force a state where a viewer is null (logged out), it would
look something like:

```ts
.mockGraphqlOps({
  operations: {
    UserQuery: {
      viewer: null
    }
  }
})
```

### Example

[Githunt React](https://github.com/tgriesser/GitHunt-React/blob/8eef144a368a7dcf4d4ff974972706dcf4840dbb/cypress/integration/feed/load_more.ts)

### License

MIT
