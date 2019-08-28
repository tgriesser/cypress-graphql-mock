import React from "react";
import { render } from "react-dom";
import { ApolloLink } from "apollo-link";
import ApolloClient from "apollo-client";
import { ApolloProvider } from "react-apollo";
import { InMemoryCache } from "apollo-cache-inmemory";
import { HttpLink } from "apollo-link-http";
import { createPersistedQueryLink } from "apollo-link-persisted-queries";
import { App } from "./App";

const links = [new HttpLink({ uri: "/graphql" })];

// Did we enable the Persisted Query link for this test?
if (window.__USE_PERSISTED_QUERY_LINK) {
  links.unshift(createPersistedQueryLink());
}

const client = new ApolloClient({
  uri: "/graphql",
  link: ApolloLink.from(links),
  cache: new InMemoryCache()
});

const ApolloApp = AppComponent => (
  <ApolloProvider client={client}>
    <AppComponent />
  </ApolloProvider>
);

render(ApolloApp(App), document.getElementById("root"));
