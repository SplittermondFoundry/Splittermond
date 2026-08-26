import {foundryApi} from "module/api/foundryApi";
import {FoundryDialog} from "module/api/Application";
import {isFirstActiveGM} from "module/util/foundryUserUtils";
import {settings} from "module/settings";
import type {DataModel} from "module/api/DataModel";

export const MIGRATION_FLAG_SCOPE = "splittermond";
export const MIGRATION_FLAG_KEY = "itemMigrationDone";

export const migrationDoneFlag: Awaited<ReturnType<typeof settings.registerBoolean>> = {
    get: () => false,
    set: () => {},
};
settings
    .registerBoolean(MIGRATION_FLAG_KEY, { default: false, config: false, scope: "world" })
    .then((resolvedFlag) => Object.assign(migrationDoneFlag, resolvedFlag))
    .catch((error) =>
        console.error(
            `Splittermond | Failed to initialize setting ${MIGRATION_FLAG_KEY}. Falling back to ${migrationDoneFlag.get()}.`,
            error
        )
    );

export interface MigrationResult {
    worldItemsMigrated: number;
    packsMigrated: number;
    skippedPacks: string[];
}

const EMPTY_RESULT: MigrationResult = {
    worldItemsMigrated: 0,
    packsMigrated: 0,
    skippedPacks: [],
};

function isSystemPack(pack: { metadata?: { system?: string } | null }): boolean {
    return pack.metadata?.system === "splittermond";
}

async function migrateItem(item: FoundryDocument, sourceSystem: Record<string, unknown>): Promise<boolean> {
    try {
        await item.update({ system: sourceSystem });
        return true;
    } catch (error) {
        console.warn("Splittermond | itemMigration: failed to migrate item", error);
        return false;
    }
}

async function migratePacks(result: MigrationResult): Promise<void> {
    for (const pack of foundryApi.collections.packs) {
        if (isSystemPack(pack)) continue;
        if (pack.documentName !== "Item") continue;
        if (pack.locked) {
            result.skippedPacks.push(pack.title);
            continue;
        }
        const docs = await pack.getDocuments();
        let migratedAny = false;
        for (const doc of docs) {
            const sourceSystem = foundryApi.getDocumentSource(doc).system;
            if (await migrateItem(doc, sourceSystem)) {
                migratedAny = true;
            }
        }
        if (migratedAny) result.packsMigrated += 1;
    }
}

export async function runItemMigration(options?: { force?: boolean }): Promise<MigrationResult> {
    if (!isFirstActiveGM(foundryApi.currentUser, foundryApi.users)) {
        return { ...EMPTY_RESULT };
    }

    if (!options?.force && migrationDoneFlag.get()) {
        return { ...EMPTY_RESULT };
    }

    const result: MigrationResult = {
        worldItemsMigrated: 0,
        packsMigrated: 0,
        skippedPacks: [],
    };

    for (const item of foundryApi.collections.items) {
        const sourceSystem = foundryApi.getDocumentSource(item).system;
        if (await migrateItem(item, sourceSystem)) {
            result.worldItemsMigrated += 1;
        }
    }

    await migratePacks(result);

    migrationDoneFlag.set(true);
    return result;
}

export async function promptAndRunItemMigration(): Promise<void> {
    if (!isFirstActiveGM(foundryApi.currentUser, foundryApi.users)) return;
    if (migrationDoneFlag.get()) return;

    const content = foundryApi.localize("splittermond.migration.itemMigration.dialog.content");
    const dialog = new FoundryDialog({
        window: { title: "splittermond.migration.itemMigration.dialog.title" },
        content,
        buttons: [
            {
                action: "cancel",
                label: "splittermond.migration.itemMigration.dialog.cancel",
            },
            {
                action: "start",
                default: true,
                label: "splittermond.migration.itemMigration.dialog.confirm",
                callback: async () => {
                    const result = await runItemMigration();
                    foundryApi.informUser("splittermond.migration.itemMigration.result", {
                        worldItems: String(result.worldItemsMigrated),
                        packs: String(result.packsMigrated),
                        skipped: String(result.skippedPacks.length),
                    });
                    if (result.skippedPacks.length > 0) {
                        foundryApi.informUser("splittermond.migration.itemMigration.skippedList", {
                            packs: result.skippedPacks.join(", "),
                        });
                    }
                },
            },
        ],
    });
    return dialog.render({ force: true }).then(() => {});
}
