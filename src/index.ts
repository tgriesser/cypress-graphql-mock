/// <reference types="cypress" />
import { graphql, IntrospectionQuery, GraphQLError } from "graphql";
import { buildClientSchema, printSchema } from "graphql";
import {
  makeExecutableSchema,
  addMockFunctionsToSchema,
  IMocks
} from "graphql-tools";

interface MockGraphQLOptions<AllOperations extends Record<string, any>> {
  schema: string | string[] | IntrospectionQuery;
  name?: string;
  mocks?: IMocks;
  endpoint?: string;
  operations?: Partial<AllOperations>;
  /* Global Delay for stubbed responses (in ms) */
  delay?: number;
}

interface SetOperationsOpts<AllOperations> {
  name?: string;
  endpoint?: string;
  /* Operations object. Make sure that mocks must not be wrapped with `data` property */
  operations?: Partial<AllOperations>;
  /* Delay for stubbed responses (in ms) */
  delay?: number;
}

interface GQLRequestPayload<AllOperations extends Record<string, any>> {
  operationName: Extract<keyof AllOperations, string>;
  query: string;
  extensions?: { persistedQuery: any };
  variables: any;
}

declare global {
  namespace Cypress {
    interface Chainable {
      mockGraphql<AllOperations = any>(
        options?: MockGraphQLOptions<AllOperations>
      ): Cypress.Chainable;
      mockGraphqlOps<AllOperations = any>(
        options?: SetOperationsOpts<AllOperations>
      ): Cypress.Chainable;
    }
  }
}

const wait = (timeout: number) => <T>(response?: T) =>
  new Promise<T>(resolve => setTimeout(() => resolve(response), timeout));

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
Cypress.Commands.add(
  "mockGraphql",
  <AllOperations extends Record<string, any>>(
    options: MockGraphQLOptions<AllOperations>
  ) => {
    const {
      endpoint = "/graphql",
      delay = 0,
      operations = {},
      mocks = {}
    } = options;

    const schema = makeExecutableSchema({
      typeDefs: schemaAsSDL(options.schema)
    });

    addMockFunctionsToSchema({
      schema,
      mocks
    });

    let currentDelay = delay;
    let currentOps = operations;

    cy.on("window:before:load", win => {
      const originalFetch = win.fetch;

      function mockGraphqlResponse(payload: GQLRequestPayload<AllOperations>): Promise<any> {
        const { operationName, query, variables } = payload;
        const rootValue = getRootValue<AllOperations>(
          currentOps,
          operationName,
          variables
        );

        if (
          // Additional checks here because of transpilation.
          // We will loose instanceof if we are not using specific babel plugin, or using pure TS to compile front-end
          rootValue instanceof GraphQLError ||
          rootValue.constructor === GraphQLError ||
          rootValue.constructor.name === "GraphQLError"
        ) {
          return Promise.resolve({
            data: {},
            errors: [rootValue]
          });
        }

        // If using apollo-link-persisted-queries, return an error so that Apollo
        // Client will retry as a standard GraphQL query <https://git.io/fjV9B>:
        if (payload.extensions && payload.extensions.persistedQuery) {
          return Promise.resolve({
            errors: [{ message: "PersistedQueryNotSupported" }]
          });
        }

        return graphql({
          schema,
          source: query,
          variableValues: variables,
          operationName,
          rootValue
        });
      }

      function fetch(input: RequestInfo, init?: RequestInit) {
        if (typeof input !== "string") {
          throw new Error(
            "Currently only support fetch(url, options), saw fetch(Request)"
          );
        }
        if (input.indexOf(endpoint) !== -1 && init && init.method === "POST") {
          const payload: GQLRequestPayload<AllOperations> = JSON.parse(
            init.body as string
          );

          // If an array of queries is sent, we're likely using apollo-link-batch-http
          // and should resolve each of them independently before responding.
          const response = Array.isArray(payload)
            ? Promise.all(payload.map(mockGraphqlResponse))
            : mockGraphqlResponse(payload);

          return response
            .then(wait(currentDelay))
            .then((data: any) => new Response(JSON.stringify(data)));
        }
        return originalFetch(input, init);
      }
      cy.stub(win, "fetch", fetch).as("fetchStub");
    });
    //
    cy.wrap({
      setOperations: (options: SetOperationsOpts<AllOperations>) => {
        currentDelay = options.delay || 0;
        currentOps = {
          ...currentOps,
          ...options.operations
        };
      }
    }).as(getAlias(options));
  }
);

Cypress.Commands.add(
  "mockGraphqlOps",
  <AllOperations extends Record<string, any>>(
    options: SetOperationsOpts<AllOperations>
  ) => {
    cy.get(`@${getAlias(options)}`).invoke("setOperations" as any, options);
  }
);

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

function getRootValue<AllOperations>(
  operations: Partial<AllOperations>,
  operationName: Extract<keyof AllOperations, string>,
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
