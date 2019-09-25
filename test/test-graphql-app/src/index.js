import React from "react";
import { render } from "react-dom";
import { ApolloLink } from "apollo-link";
import ApolloClient from "apollo-client";
import { ApolloProvider } from "react-apollo";
import { InMemoryCache } from "apollo-cache-inmemory";
import { HttpLink } from "apollo-link-http";
import { BatchHttpLink } from "apollo-link-batch-http";
import { createPersistedQueryLink } from "apollo-link-persisted-queries";
import { App } from "./App";

// Did we enable the Batch HTTP query link for this test?
const httpLink = window.__USE_BATCH_HTTP_LINK
  ? new BatchHttpLink({ uri: "/graphql" })
  : new HttpLink({ uri: "/graphql" });

const links = [httpLink];

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
