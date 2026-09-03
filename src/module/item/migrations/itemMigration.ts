import { foundryApi } from "module/api/foundryApi";
import { MigrationBuilder, type MigrationResult } from "module/migrations/Migrator";

export const MIGRATION_FLAG_SCOPE = "splittermond";
export const MIGRATION_FLAG_KEY = "itemV14MigrationDone";

export type { MigrationResult };

export async function migrateItem(item: FoundryDocument, sourceSystem: Record<string, unknown>): Promise<boolean> {
    await item.update({ system: sourceSystem }, { diff: false });
    return true;
}

function itemMigrationBuilder(): MigrationBuilder<FoundryDocument> {
    return new MigrationBuilder<FoundryDocument>(MIGRATION_FLAG_KEY)
        .withWorldCollection(() => foundryApi.collections.items)
        .withDocumentClass("Item")
        .withMigrationProcess(migrateItem)
        .withI18nPrefix("splittermond.migration.itemMigration");
}

const productionItemMigration = itemMigrationBuilder();

export const migrationDoneFlag: typeof productionItemMigration.migrationDoneFlag =
    productionItemMigration.migrationDoneFlag;

const itemMigrator = productionItemMigration.build();

export async function runItemMigration(options?: { force?: boolean }): Promise<MigrationResult> {
    return itemMigrator.run(options);
}

export async function promptAndRunItemMigration(): Promise<void> {
    return itemMigrator.promptAndRun();
}
