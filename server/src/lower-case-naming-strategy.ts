import { DefaultNamingStrategy } from 'typeorm';

export default class LowerCaseNamingStrategy extends DefaultNamingStrategy {
  tableName(
    targetName: string,
    userSpecifiedName: string | undefined,
  ): string {
    return super.tableName(targetName, userSpecifiedName).toLowerCase();
  }

  columnName(
    propertyName: string,
    customName: string,
    embeddedPrefixes: string[],
  ): string {
    return super
      .columnName(propertyName, customName, embeddedPrefixes)
      .toLowerCase();
  }

  relationName(propertyName: string): string {
    return super.relationName(propertyName).toLowerCase();
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return super
      .joinColumnName(relationName, referencedColumnName)
      .toLowerCase();
  }

  joinTableName(
    firstTableName: string,
    secondTableName: string,
    firstPropertyName: string,
    secondPropertyName: string,
  ): string {
    return super
      .joinTableName(
        firstTableName,
        secondTableName,
        firstPropertyName,
        secondPropertyName,
      )
      .toLowerCase();
  }

  joinTableColumnName(
    tableName: string,
    propertyName: string,
    columnName?: string,
  ): string {
    return super
      .joinTableColumnName(tableName, propertyName, columnName)
      .toLowerCase();
  }

  classTableInheritanceParentColumnName(
    parentTableName: string,
    parentTableIdPropertyName: string,
  ): string {
    return super
      .classTableInheritanceParentColumnName(
        parentTableName,
        parentTableIdPropertyName,
      )
      .toLowerCase();
  }

  eagerJoinRelationAlias(alias: string, propertyPath: string): string {
    return `${alias}_${propertyPath.replace(/\./g, '_')}`.toLowerCase();
  }
}
