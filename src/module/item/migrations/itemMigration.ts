import { foundryApi } from "module/api/foundryApi";
import { MigrationBuilder, type MigrationResult } from "module/migrations/Migrator";

export const MIGRATION_FLAG_SCOPE = "splittermond";
export const MIGRATION_FLAG_KEY = "itemMigrationDone";

export type { MigrationResult };

async function migrateItem(item: FoundryDocument, sourceSystem: Record<string, unknown>): Promise<boolean> {
    await item.update({ system: sourceSystem });
    return true;
}

const itemMigration = new MigrationBuilder<FoundryDocument>(MIGRATION_FLAG_KEY)
    .withWorldCollection(() => foundryApi.collections.items)
    .withDocumentClass("Item")
    .withMigrationProcess(migrateItem)
    .withI18nPrefix("splittermond.migration.itemMigration");

export const migrationDoneFlag = itemMigration.migrationDoneFlag;

const itemMigrator = itemMigration.build();

export async function runItemMigration(options?: { force?: boolean }): Promise<MigrationResult> {
    return itemMigrator.run(options);
}

export async function promptAndRunItemMigration(): Promise<void> {
    return itemMigrator.promptAndRun();
}
