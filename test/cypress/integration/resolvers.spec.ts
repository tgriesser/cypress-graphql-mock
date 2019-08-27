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
        user: {
          id: 1,
          name: "Test User",
          email: "Email",
          createdAt: new Date("2019-01-01T00:00:00.000Z"),
          __typename: "User"
        }
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
      "Error :" +
        JSON.stringify({
          graphQLErrors: [{ message: "Some message" }],
          networkError: null,
          message: "GraphQL error: Some message"
        })
    );
  });

  it("Should wait for the delayed response", () => {
    cy.mockGraphqlOps({
      delay: 2000,
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
    cy.get("#tester").contains("Loading...");
    cy.wait(2000);
    cy.get("#tester").should("not.contain", "Loading...");
  });
});
