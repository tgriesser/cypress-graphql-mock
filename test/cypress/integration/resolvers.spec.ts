import { GraphQLError } from "graphql";

describe("Resolvers", () => {
  beforeEach(() => {
    cy.task("getSchema").then(schema => {
      cy.mockGraphql({ schema });
    });
  });

  it("Should mock getUser", () => {
    cy.mockGraphqlOps({
      operations: {
        getUser: {
          user: {
            id: 1,
            name: "Name",
            email: "Email"
          }
        }
      }
    });

    cy.visit("/");
    cy.get("#GET_USER").click();
    cy.get("#data").should(
      "contain",
      JSON.stringify({
        user: { id: 1, name: "Name", email: "Email", __typename: "User" }
      })
    );
  });

  it("Should throw graphql error", () => {
    cy.mockGraphqlOps({
      operations: {
        getUser: new GraphQLError("Some message")
      }
    });

    cy.visit("/");
    cy.get("#GET_USER").click();
    cy.get("#error").should(
      "contain",
      "Error :" + JSON.stringify({
        graphQLErrors: [{ message: "Some message" }],
        networkError: null,
        message: "GraphQL error: Some message"
      })
    );
  });
});
