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
    cy.get("#GET_USER_RESULT").should(
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

  it("Should wait for the delayed response", () => {
    cy.mockGraphqlOps({
      delay: 2000,
      operations: {
        user: {
          id: 1,
          name: "Name",
          email: "Email"
        }
      }
    });

    cy.visit("/");
    cy.get("#GET_USER").click();
    cy.get("#tester").contains('Loading...')
    cy.wait(2000)
    cy.get("#tester").should('not.contain', 'Loading...')
  });


  it("Should rerequest persisted queries", () => {
    cy.on('window:before:load', window => window.__USE_PERSISTED_QUERY_LINK = true);

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
    cy.get("#GET_USER_RESULT").should(
      "contain",
      JSON.stringify({
        user: { id: 1, name: "Name", email: "Email", __typename: "User" }
      })
    );
  });

  it("Should handle batched queries", () => {
    cy.on('window:before:load', window => window.__USE_BATCH_HTTP_LINK = true);

    cy.mockGraphqlOps({
      operations: {
        getUser: {
          user: {
            id: 1,
            name: "Name",
            email: "Email"
          }
        },
        getRecipe: {
          recipe: {
            id: 1,
            title: "Pancakes",
            ingredients: "Flour, baking soda, salt, egg, milk",
          }
        }
      }
    });

    cy.visit("/");
    cy.get("#MULTIPLE").click();

    cy.get("#GET_USER_RESULT")
      .should("contain", JSON.stringify({
        user: { id: 1, name: "Name", email: "Email", __typename: "User" }
      }));

    cy.get("#GET_RECIPE_RESULT")
      .should("contain", JSON.stringify({
        recipe: { id: 1, title: "Pancakes", ingredients: "Flour, baking soda, salt, egg, milk", __typename: "Recipe" }
      }));
  });
});
