/// <reference types="cypress" />
import { graphql, IntrospectionQuery } from "graphql";
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
}

interface SetOperationsOpts<AllOperations> {
  name?: string;
  endpoint?: string;
  operations?: Partial<AllOperations>;
}

interface GQLRequestPayload<AllOperations extends Record<string, any>> {
  operationName: Extract<keyof AllOperations, string>;
  query: string;
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
    const { endpoint = "/graphql", operations = {}, mocks = {} } = options;

    const schema = makeExecutableSchema({
      typeDefs: schemaAsSDL(options.schema)
    });

    addMockFunctionsToSchema({
      schema,
      mocks
    });

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
          const payload: GQLRequestPayload<AllOperations> = JSON.parse(
            init.body as string
          );
          const { operationName, query, variables } = payload;
          return graphql({
            schema,
            source: query,
            variableValues: variables,
            operationName,
            rootValue: getRootValue<AllOperations>(
              currentOps,
              operationName,
              variables
            )
          }).then((data: any) => new Response(JSON.stringify(data)));
        }
        return originalFetch(input, init);
      }
      cy.stub(win, "fetch", fetch).as("fetchStub");
    });
    //
    cy.wrap({
      setOperations: (newOperations: Partial<AllOperations>) => {
        currentOps = {
          ...currentOps,
          ...(newOperations as object)
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
    cy.get(`@${getAlias(options)}`).invoke(
      "setOperations" as any,
      options.operations || {}
    );
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
    return op(variables);
  }
  return op;
}
