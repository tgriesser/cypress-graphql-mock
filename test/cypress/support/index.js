// @ts-check
/// <reference path="../generated/generated-mock-types.d.ts" />
import { setBaseGraphqlMocks } from "../../../dist";
setBaseGraphqlMocks({
  EnumField: () => "CAT",
  User: () => ({
    name: "Test User"
  }),
  DateTime(obj, args, context, field) {
    if (obj[field.fieldName]) return obj[field.fieldName];
    return new Date("2019-01-01");
  }
});
