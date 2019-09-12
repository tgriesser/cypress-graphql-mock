/// <reference types="cypress" />
import { graphql, IntrospectionQuery, GraphQLError } from "graphql";
import { buildClientSchema, printSchema } from "graphql";
import { makeExecutableSchema, addMockFunctionsToSchema } from "graphql-tools";

export interface MockGraphQLOptions extends SetOperationsOpts {
  schema?: string | string[] | IntrospectionQuery;
  mocks?: CypressMockBaseTypes;
}

export interface SetOperationsOpts {
  name?: string;
  endpoint?: string;
  /* Operations object. Make sure that mocks must not be wrapped with `data` property */
  operations?: Partial<CypressMockOperationTypes>;
  /* Delay for stubbed responses (in ms) */
  delay?: number;
}

export interface GQLRequestPayload {
  operationName: Extract<keyof CypressMockOperationTypes, string>;
  query: string;
  variables: any;
}

let commonMocks: any = null;
let commonOptions: any = null;

declare global {
  interface CypressMockBaseTypes {}
  interface CypressMockOperationTypes extends Record<string, any> {}
  namespace Cypress {
    interface Chainable {
      mockGraphql(options?: MockGraphQLOptions): Cypress.Chainable;
      mockGraphqlOps(options?: SetOperationsOpts): Cypress.Chainable;
    }
  }
}

const wait = (timeout: number) => <T>(response?: T) =>
  new Promise<T>(resolve => setTimeout(() => resolve(response), timeout));

/**
 * Add .baseGraphqlMocks() to the Cypress chain. Used when we want to set the
 * mocks as common between multiple commands.
 */
export const setBaseGraphqlMocks = (mocks: CypressMockBaseTypes) => {
  if (!commonMocks) {
    commonMocks = mocks;
  } else {
    throw new Error(
      `setBaseGraphqlMocks may only be called once, already called.`
    );
  }
  return mocks;
};

/**
 * Add .baseGraphqlMocks() to the Cypress chain. Used when we want to set the
 * mocks as common between multiple commands.
 */
export const setBaseOperationOptions = (options: CypressMockBaseTypes) => {
  if (!commonOptions) {
    commonOptions = options;
  } else {
    throw new Error(
      `setBaseOperationOptions may only be called once, already called.`
    );
  }
  return options;
};

/**
 * Adds a .mockGraphql() and .mockGraphqlOps() methods to the cypress chain.
 *
 * The .mockGraphql should be called in the cypress "before" or "beforeEach" block
 * config to setup the server.
 *
 * By default, it will use the /graphql endpoint, but this can be changed
 * depending on the server implementation
 *
 * It takes an "operations" object, representing the named operations
 * of the GraphQL server. This is combined with the "mocks" option,
 * to modify the output behavior per test.
 *
 * The .mockGraphqlOps() allows you to configure the mock responses at a
 * more granular level
 *
 * For example, if we has a query called "UserQuery" and wanted to
 * explicitly force a state where a viewer is null (logged out), it would
 * look something like:
 *
 * .mockGraphqlOps({
 *   operations: {
 *     UserQuery: {
 *       viewer: null
 *     }
 *   }
 * })
 */
Cypress.Commands.add("mockGraphql", (options?: MockGraphQLOptions) => {
  const mergedOptions = {
    ...(commonOptions || {}),
    ...(options || {})
  };
  const {
    endpoint = "/graphql",
    delay = 0,
    operations = {},
    mocks = {},
    schema = undefined
  } = mergedOptions;

  if (!schema) {
    throw new Error(
      "Schema must be provided to the mockGraphql or setBaseOperationOptions"
    );
  }

  const executableSchema = makeExecutableSchema({
    typeDefs: schemaAsSDL(schema)
  });

  addMockFunctionsToSchema({
    schema: executableSchema,
    mocks: {
      ...commonMocks,
      ...mocks
    }
  });

  let currentDelay = delay;
  let currentOps = operations;

  cy.on("window:before:load", win => {
    const originalFetch = win.fetch;
    function fetch(input: RequestInfo, init?: RequestInit) {
      if (typeof input !== "string") {
        throw new Error(
          "Currently only support fetch(url, options), saw fetch(Request)"
        );
      }
      if (input.indexOf(endpoint) !== -1 && init && init.method === "POST") {
        const payload: GQLRequestPayload = JSON.parse(init.body as string);
        const { operationName, query, variables } = payload;
        const rootValue = getRootValue(currentOps, operationName, variables);

        if (
          // Additional checks here because of transpilation.
          // We will loose instanceof if we are not using specific babel plugin, or using pure TS to compile front-end
          rootValue instanceof GraphQLError ||
          rootValue.constructor === GraphQLError ||
          rootValue.constructor.name === "GraphQLError"
        ) {
          return Promise.resolve()
            .then(wait(currentDelay))
            .then(
              () =>
                new Response(
                  JSON.stringify({
                    data: {},
                    errors: [rootValue]
                  })
                )
            );
        }

        return graphql({
          schema,
          source: query,
          variableValues: variables,
          operationName,
          rootValue
        })
          .then(wait(currentDelay))
          .then((data: any) => new Response(JSON.stringify(data)));
      }
      return originalFetch(input, init);
    }
    cy.stub(win, "fetch", fetch).as("fetchStub");
  });
  //
  cy.wrap({
    setOperations: (options: SetOperationsOpts) => {
      currentDelay = options.delay || 0;
      currentOps = {
        ...currentOps,
        ...options.operations
      };
    }
  }).as(getAlias(mergedOptions));
});

Cypress.Commands.add("mockGraphqlOps", (options: SetOperationsOpts) => {
  cy.get(`@${getAlias(options)}`).invoke("setOperations" as any, options);
});

const getAlias = ({ name, endpoint }: { name?: string; endpoint?: string }) => {
  if (name || endpoint) {
    return `mockGraphqlOps:${name || endpoint}`;
  }
  return "mockGraphqlOps";
};

// Takes the schema either as the full .graphql file (string) or
// the introspection object.
function schemaAsSDL(schema: string | string[] | IntrospectionQuery) {
  if (typeof schema === "string" || Array.isArray(schema)) {
    return schema;
  }
  return printSchema(buildClientSchema(schema));
}

function getRootValue(
  operations: Partial<CypressMockOperationTypes>,
  operationName: Extract<keyof CypressMockOperationTypes, string>,
  variables: any
) {
  if (!operationName || !operations[operationName]) {
    return {};
  }
  const op = operations[operationName];
  if (typeof op === "function") {
    try {
      return op(variables);
    } catch (e) {
      return e; // properly handle dynamic throw new GraphQLError("message")
    }
  }

  return op;
}
