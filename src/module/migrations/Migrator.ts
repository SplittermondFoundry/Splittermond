import { foundryApi } from "module/api/foundryApi";
import { FoundryDialog } from "module/api/Application";
import { isFirstActiveGM } from "module/util/foundryUserUtils";
import { settings } from "module/settings";

type MigrationSetting = Awaited<ReturnType<typeof settings.registerBoolean>>;

export type MigrationProcess<T extends FoundryDocument> = (
    document: T,
    pristineSource: Record<string, unknown>
) => Promise<boolean>;

export interface MigrationResult {
    worldDocumentsMigrated: number;
    packsMigrated: number;
    skippedPacks: string[];
}

function emptyMigrationResult(): MigrationResult {
    return { worldDocumentsMigrated: 0, packsMigrated: 0, skippedPacks: [] };
}

export class MigrationBuilder<T extends FoundryDocument> {
    private resolvedSetting: MigrationSetting | null = null;
    private worldCollection: (() => Collection<T>) | null = null;
    private documentClass: string | null = null;
    private migrationProcess: MigrationProcess<T> | null = null;
    private i18nPrefix: string | null = null;

    readonly migrationDoneFlag: MigrationSetting = {
        get: () => this.resolvedSetting?.get() ?? false,
        set: (value) => this.resolvedSetting?.set(value),
    };

    constructor(readonly name: string) {
        settings
            .registerBoolean(name, { default: false, config: false, scope: "world" })
            .then((resolved) => {
                this.resolvedSetting = resolved;
            })
            .catch((error) =>
                console.error(
                    `Splittermond | Failed to initialize setting ${name}. Falling back to ${this.migrationDoneFlag.get()}.`,
                    error
                )
            );
    }

    withWorldCollection(worldCollection: () => Collection<T>): this {
        this.worldCollection = worldCollection;
        return this;
    }

    withDocumentClass(documentClass: string): this {
        this.documentClass = documentClass;
        return this;
    }

    withMigrationProcess(migrationProcess: MigrationProcess<T>): this {
        this.migrationProcess = migrationProcess;
        return this;
    }

    withI18nPrefix(i18nPrefix: string): this {
        this.i18nPrefix = i18nPrefix;
        return this;
    }

    build(): Migrator<T> {
        if (!this.worldCollection || !this.documentClass || !this.migrationProcess || !this.i18nPrefix) {
            throw new Error(`Splittermond | Migration "${this.name}" is not fully configured.`);
        }
        return new Migrator(
            this.name,
            this.migrationDoneFlag,
            this.documentClass,
            this.worldCollection,
            this.migrationProcess,
            this.i18nPrefix
        );
    }
}

export class Migrator<T extends FoundryDocument> {
    constructor(
        private readonly name: string,
        private readonly migrationSetting: MigrationSetting,
        private readonly documentClass: string,
        private readonly worldCollection: () => Collection<T>,
        private readonly migrationProcess: MigrationProcess<T>,
        private readonly i18nPrefix: string
    ) {}

    async run(options?: { force?: boolean }): Promise<MigrationResult> {
        if (!isFirstActiveGM(foundryApi.currentUser, foundryApi.users)) {
            return emptyMigrationResult();
        }
        if (!options?.force && this.migrationSetting.get()) {
            return emptyMigrationResult();
        }

        const result = emptyMigrationResult();
        for (const document of this.worldCollection()) {
            if (await this.applyMigration(document)) {
                result.worldDocumentsMigrated += 1;
            }
        }
        await this.migratePacks(result);

        this.migrationSetting.set(true);
        return result;
    }

    async promptAndRun(): Promise<void> {
        if (!isFirstActiveGM(foundryApi.currentUser, foundryApi.users)) return;
        if (this.migrationSetting.get()) return;

        const content = foundryApi.localize(`${this.i18nPrefix}.dialog.content`);
        const dialog = new FoundryDialog({
            window: { title: `${this.i18nPrefix}.dialog.title` },
            content,
            buttons: [
                {
                    action: "cancel",
                    label: `${this.i18nPrefix}.dialog.cancel`,
                },
                {
                    action: "start",
                    default: true,
                    label: `${this.i18nPrefix}.dialog.confirm`,
                    callback: async () => {
                        const result = await this.run();
                        foundryApi.informUser(`${this.i18nPrefix}.result`, {
                            worldItems: String(result.worldDocumentsMigrated),
                            packs: String(result.packsMigrated),
                            skipped: String(result.skippedPacks.length),
                        });
                        if (result.skippedPacks.length > 0) {
                            foundryApi.informUser(`${this.i18nPrefix}.skippedList`, {
                                packs: result.skippedPacks.join(", "),
                            });
                        }
                    },
                },
            ],
        });
        return dialog.render({ force: true }).then(() => {});
    }

    private async migratePacks(result: MigrationResult): Promise<void> {
        for (const pack of foundryApi.collections.packs) {
            if (isSystemPack(pack)) continue;
            if (pack.documentName !== this.documentClass) continue;
            if (pack.locked) {
                result.skippedPacks.push(pack.title);
                continue;
            }
            const docs = await pack.getDocuments();
            let migratedAny = false;
            for (const doc of docs) {
                if (await this.applyMigration(doc as T)) {
                    migratedAny = true;
                }
            }
            if (migratedAny) result.packsMigrated += 1;
        }
    }

    private async applyMigration(document: T): Promise<boolean> {
        try {
            return await this.migrationProcess(document, foundryApi.getDocumentSource(document).system);
        } catch (error) {
            console.warn(`Splittermond | migration "${this.name}": failed to migrate document`, error);
            return false;
        }
    }
}

function isSystemPack(pack: { metadata?: { system?: string } | null }): boolean {
    return pack.metadata?.system === "splittermond";
}
