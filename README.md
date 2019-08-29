# cypress-graphql-mock

Adds commands for executing a mocked GraphQL server using only the client

## Installation

`npm install cypress-graphql-mock`

in Cypress' `commands.js` add:

```js
import { setBaseGraphqlMocks } from "cypress-graphql-mock";

// Set all of your base mocks, as described in
// https://www.apollographql.com/docs/graphql-tools/mocking/#default-mock-example
setBaseGraphqlMocks({
  User: () => ({
    id: () => randomId(),
    name: "Test User"
  }),
  DateTime(obj, args, context, field) {
    if (obj[field.fieldName]) return obj[field.fieldName];
    return new Date("2019-01-01");
  }
});
```

See the "code generation" section below for more info on how to generate types for this.

## Instructions

Adds `.mockGraphql()` and `.mockGraphqlOps()` methods to the cypress chain.

The `.mockGraphql` should be called in the Cypress `before` or `beforeEach` block
config to setup the server. This method takes a schema, either in the form of one or more SDL files, or as the JSON result of an introspection query.

```ts
const schema = fs.readFileSync("../../app-schema.graphql", "utf8");
// alternatively, using a dumped introspection query:
// const schema = require('../../dumped-schema.json')

beforeEach(() => {
  cy.server();
  cy.mockGraphql({ schema });
});
```

Actually it is not possible to use `fs.readFileSync` right in the cypress tests. So here you can create custom command. Add this to your `cypress/plugins/index.js`.

```ts
module.exports = (on, config) => {
  on("task", {
    getSchema() {
      return fs.readFileSync(
        path.resolve(__dirname, "../../app-schema.graphql""),
        "utf8"
      );
    }
  });
};
```

And then in the code you will be able to

```ts
beforeEach(() => {
  cy.task("getSchema").then(schema => {
    cy.mockGraphql({
      schema,
      operations: { ... }
    });
  });
});
```

By default, it will use the `/graphql` endpoint, but this can be changed
depending on the expected server implementation.

```ts
beforeEach(() => {
  cy.server();
  cy.mockGraphql({
    schema,
    endpoint: "/gql"
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

### Examples

#### Real application example

- [Githunt React](https://github.com/tgriesser/GitHunt-React/blob/8eef144a368a7dcf4d4ff974972706dcf4840dbb/cypress/integration/feed/load_more.ts)

#### Simple mutation

Just return mutation result. Make sure that mostly always you will need to duplicate mutation name 1st time as operation key, and 2nd as return data object key.

```ts
cy.server();
cy.mockGraphql({ schema });
cy.mockGraphqlOps({
  operations: {
    userNameChange: {
      userNameChange: {
        name: "New user name"
      }
    }
  }
});
```

It is also possible to pass a function to simulate dynamic resolver.

```ts
cy.server();
cy.mockGraphql({ schema });
cy.mockGraphqlOps({
  operations: {
    userNameChange: variables => ({
      userNameChange: {
        viewer: {
          name: variables.name
        }
      }
    })
  }
});
```

#### Delay

In order to test asynchronous behavior sometimes you will need to delay your graphql request. This can be done with a help of `delay` option.

```ts
cy.mockGraphqlOps({
  operations: {
    delay: 1000, // 1 second
    userNameChange: new GraphQLError("Your message goes here")
  }
});
```

#### Code Generation

This plugin ships with a [graphql-code-generator](https://graphql-code-generator.com/) plugin to generate typings for the "RootTypes" and the mock operations.

See the [graphql-code-generator](https://graphql-code-generator.com/docs/plugins/) docs around plugins, and the example app / `codegen.yml` in the root for an example use:

```yml
test/cypress/generated/generated-mock-types.d.ts:
  documents: "test/test-graphql-app/**/*.jsx"
  plugins:
    - typescript
    - typescript-operations
    - cypress-graphql-mock/codegen
  config:
    enumsAsTypes: true
```

#### Error handling

```ts
import { GraphQLError } from "graphql";

cy.mockGraphqlOps({
  delay: 1000, // wait 1 second
  operations: {
    userNameChange: new GraphQLError("Your message goes here")
  }
});
```

It is also possible to throw error from the function. Just `return` or `throw` a GraphQLError.

```ts
cy.mockGraphqlOps({
  operations: {
    userNameChange: variables => {
      if (!variables.name) {
        throw new GraphQLError("Name is required");
      }
    }
  }
});
```

### License

MIT
