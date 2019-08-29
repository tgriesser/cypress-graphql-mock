export type Maybe<T> = T | null;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  DateTime: any;
};

export type EnumField = "CAT" | "DOG";

export type Mutation = {
  __typename?: "Mutation";
  createUser: User;
  createRecipe: Recipe;
};

export type MutationCreateUserArgs = {
  name: Scalars["String"];
  email: Scalars["String"];
  password: Scalars["String"];
};

export type MutationCreateRecipeArgs = {
  userId: Scalars["Int"];
  title: Scalars["String"];
  ingredients: Scalars["String"];
  direction: Scalars["String"];
};

export type Query = {
  __typename?: "Query";
  user?: Maybe<User>;
  allRecipes: Array<Recipe>;
  recipe?: Maybe<Recipe>;
  enumField?: Maybe<EnumField>;
};

export type QueryUserArgs = {
  id: Scalars["Int"];
};

export type QueryRecipeArgs = {
  id: Scalars["Int"];
};

export type Recipe = {
  __typename?: "Recipe";
  id: Scalars["Int"];
  title: Scalars["String"];
  ingredients: Scalars["String"];
  direction: Scalars["String"];
  user: User;
};

export type User = {
  __typename?: "User";
  id: Scalars["Int"];
  name: Scalars["String"];
  email: Scalars["String"];
  recipes: Array<Recipe>;
  createdAt: Scalars["DateTime"];
};
export type GetUserQueryVariables = {};

export type GetUserQuery = { __typename?: "Query" } & {
  user: Maybe<
    { __typename?: "User" } & Pick<User, "id" | "name" | "email" | "createdAt">
  >;
};

import { GraphQLResolveInfo, GraphQLError } from "graphql";

export type MockResolve<T> = (
  obj: any,
  args: any,
  ctx: any,
  info: GraphQLResolveInfo
) => T;

export type ErrorOrValue<T> = T | GraphQLError;

export type ResolverOrValue<T> = T | MockResolve<T>;

export type PartialDeep<T> = { [P in keyof T]?: PartialDeep<T[P]> };

export type PartialResolveDeep<T> = T extends object
  ? { [P in keyof T]?: ResolverOrValue<PartialResolveDeep<T[P]>> }
  : T;

export type TypeMock<T> = () => PartialResolveDeep<T>;

declare global {
  interface CypressMockBaseTypes {
    Boolean?: MockResolve<Scalars["Boolean"]>;
    DateTime?: MockResolve<Scalars["DateTime"]>;
    EnumField?: MockResolve<EnumField>;
    Int?: MockResolve<Scalars["Int"]>;
    Mutation?: TypeMock<Mutation>;
    Query?: TypeMock<Query>;
    Recipe?: TypeMock<Recipe>;
    String?: MockResolve<Scalars["String"]>;
    User?: TypeMock<User>;
  }
  interface CypressMockOperationTypes {
    getUser: ErrorOrValue<GetUserQuery | PartialDeep<GetUserQuery>>;
  }
}
