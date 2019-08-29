import { CodegenPlugin, toPascalCase } from "@graphql-codegen/plugin-helpers";
import {
  isExecutableDefinitionNode,
  Kind,
  isScalarType,
  isInterfaceType,
  isObjectType,
  isUnionType,
  OperationTypeNode,
  isEnumType
} from "graphql";

export = {
  plugin(schema, documents, config) {
    let additionalImports = "";
    let tPrefix = "";
    if (config && config.typesFile) {
      additionalImports += `import * as t from ${JSON.stringify(
        config.typesFile
      )}`;
      tPrefix = "t.";
    }
    const allTypes = schema.getTypeMap();
    const documentOperations: { name: string; op: OperationTypeNode }[] = [];
    const MockOperationTypes: string[] = [];
    documents.forEach(d =>
      d.content.definitions.forEach(node => {
        if (
          isExecutableDefinitionNode(node) &&
          node.kind === Kind.OPERATION_DEFINITION &&
          node.name
        ) {
          documentOperations.push({
            name: node.name.value,
            op: node.operation
          });
        }
      })
    );
    documentOperations.forEach(o => {
      const typeVal = `${tPrefix}${toPascalCase(`${o.name}_${o.op}`)}`;
      MockOperationTypes.push(
        `${o.name}: ErrorOrValue<${typeVal} | PartialDeep<${typeVal}>>`
      );
    });
    const MockBaseTypesBody = Object.keys(allTypes)
      .sort()
      .map(typeName => {
        if (typeName.startsWith("__")) {
          return "";
        }
        const pascalName = toPascalCase(typeName);
        const type = allTypes[typeName];
        let typeVal = "unknown";
        if (isScalarType(type)) {
          typeVal = `MockResolve<${tPrefix}Scalars['${typeName}']>;`;
        } else if (isInterfaceType(type) || isUnionType(type)) {
          typeVal = schema
            .getPossibleTypes(type)
            .map(t => `TypeMock<${tPrefix}${t.name}>`)
            .join(" | ");
        } else if (isObjectType(type)) {
          typeVal = `TypeMock<${tPrefix}${pascalName}>`;
        } else if (isEnumType(type)) {
          typeVal = `MockResolve<${tPrefix}${pascalName}>`;
        }
        return `${typeName}?: ${typeVal}`;
      });

    return `
${additionalImports}
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

export type PartialResolveDeep<T> = T extends object ? {
  [P in keyof T]?: ResolverOrValue<PartialResolveDeep<T[P]>>
} : T;

export type TypeMock<T> = () => PartialResolveDeep<T>;

declare global {
  interface CypressMockBaseTypes {
    ${MockBaseTypesBody.join("\n")}
  }
  interface CypressMockOperationTypes {
    ${MockOperationTypes.join("\n")}
  }
}
`;
  }
} as CodegenPlugin;
