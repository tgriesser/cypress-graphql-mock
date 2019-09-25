import React from "react";
import gql from "graphql-tag";
import { Query } from "react-apollo";
import Grid from "@material-ui/core/Grid";
import ToggleButton from "@material-ui/lab/ToggleButton";
import ToggleButtonGroup from "@material-ui/lab/ToggleButtonGroup";
import { Card, CardContent } from "@material-ui/core";

const queries = {
  GET_USER: gql`
    query getUser {
      user(id: 1) {
        id
        name
        email
      }
    }
  `,
  GET_RECIPE: gql`
    query getRecipe {
      recipe(id: 1) {
        id
        title
        ingredients
      }
    }
  `
};

export const App = () => {
  const [currentQuery, setQuery] = React.useState(null);
  return (
    <Grid id="tester" container direction="column">
      <ToggleButtonGroup
        exclusive
        value={currentQuery}
        size="large"
        onChange={(e, value) => setQuery(value)}
      >
        {Object.keys(queries).map(query => (
          <ToggleButton
            key={query}
            id={query}
            value={[query]}
            children={query}
          />
        ))}
        <ToggleButton
          key="MULTIPLE"
          id="MULTIPLE"
          children="GET_USER+GET_RECIPE"
          value={["GET_USER", "GET_RECIPE"]}
        />
      </ToggleButtonGroup>

      {currentQuery &&
        currentQuery.map(query => (
          <Card>
            <CardContent>
              <Query query={queries[query]}>
                {({ loading, error, data }) => {
                  if (loading) return <div id="loading">Loading...</div>;
                  if (error)
                    return (
                      <div id="error">Error :{JSON.stringify(error)} </div>
                    );

                  return (
                    <div id={`${query}_RESULT`}> {JSON.stringify(data)} </div>
                  );
                }}
              </Query>
            </CardContent>
          </Card>
        ))}
    </Grid>
  );
};
