import * as t from "./generated-operation-types";
import { GraphQLResolveInfo, GraphQLError } from "graphql";

export type MockResolve<T> = (
  obj: any,
  args: any,
  ctx: any,
  info: GraphQLResolveInfo
) => T;

export type ErrorOrValue<T> = GraphQLError | T;

export type ResolverOrValue<T> = T | MockResolve<T>;

export type PartialDeep<T> = { [P in keyof T]?: PartialDeep<T[P]> };

export type PartialResolveDeep<T> = T extends object
  ? { [P in keyof T]?: ResolverOrValue<PartialResolveDeep<T[P]>> }
  : T;

export type TypeMock<T, U = PartialResolveDeep<T>> = () => U;

declare global {
  interface CypressMockBaseTypes {
    Boolean?: MockResolve<t.Scalars["Boolean"]>;
    DateTime?: MockResolve<t.Scalars["DateTime"]>;
    EnumField?: MockResolve<t.EnumField>;
    Int?: MockResolve<t.Scalars["Int"]>;
    Mutation?: TypeMock<t.Mutation>;
    Query?: TypeMock<t.Query>;
    Recipe?: TypeMock<t.Recipe>;
    String?: MockResolve<t.Scalars["String"]>;
    User?: TypeMock<t.User>;
  }
  interface CypressMockOperationTypes {
    getUser: ErrorOrValue<t.GetUserQuery | PartialDeep<t.GetUserQuery>>;
  }
}
