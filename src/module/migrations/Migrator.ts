import { foundryApi } from "module/api/foundryApi";
import { FoundryDialog } from "module/api/Application";
import { isFirstActiveGM } from "module/util/foundryUserUtils";
import { settings } from "module/settings";
import { MigrationReporter } from "module/migrations/MigrationReporter";
import { pipe } from "module/util/util";

type RegisteredMigrationSetting = Awaited<ReturnType<typeof settings.registerBoolean>>;

interface MigrationSetting {
    get(): boolean;
    set(value: boolean): void;
    ready(): Promise<void>;
    isFunctional(): boolean;
}

export type CompendiumSource = () => Iterable<foundry.documents.collections.CompendiumCollection>;

export type CompendiumFilter = (pack: foundry.documents.collections.CompendiumCollection) => boolean;

export type MigrationProcess<T extends FoundryDocument> = (
    document: T,
    pristineSource: Record<string, unknown>
) => Promise<boolean>;

export interface MigrationResult {
    worldDocumentsMigrated: number;
    packsMigrated: number;
    skippedPacks: string[];
}

interface MigratablePack {
    pack: foundry.documents.collections.CompendiumCollection;
    size: number;
}

function emptyMigrationResult(): MigrationResult {
    return { worldDocumentsMigrated: 0, packsMigrated: 0, skippedPacks: [] };
}

export class MigrationBuilder<T extends FoundryDocument> {
    private resolvedSetting: RegisteredMigrationSetting | null = null;
    private settingReady: Promise<void> = Promise.resolve();
    private worldCollection: (() => Iterable<FoundryDocument>) | null = null;
    private compendiumSource: CompendiumSource = () => foundryApi.collections.packs;
    private migrationProcess: MigrationProcess<T> | null = null;
    private i18nPrefix: string | null = null;
    private filterSet: boolean = false;
    private documentClass: string | null = null;

    readonly migrationDoneFlag: MigrationSetting = {
        get: () => this.resolvedSetting?.get() ?? false,
        set: (value) => this.setDoneFlag(value),
        ready: () => this.settingReady,
        isFunctional: () => this.resolvedSetting !== null,
    };

    constructor(readonly name: string) {
        this.settingReady = settings
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

    private setDoneFlag(value: boolean): void {
        if (!this.resolvedSetting) {
            console.error(
                `Splittermond | Migration "${this.name}": cannot persist the migration-done flag because the setting is not registered. The migration will run again.`
            );
            return;
        }
        this.resolvedSetting.set(value);
    }

    withWorldCollection(worldCollection: () => Iterable<FoundryDocument>): this {
        this.worldCollection = worldCollection;
        return this;
    }

    withCompendiumFilter(compendiumFilter: CompendiumFilter): this {
        const previousSource = this.compendiumSource;
        this.compendiumSource = pipe(previousSource, (source) => filter(source, compendiumFilter));
        this.filterSet = true;
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
        if (
            !this.worldCollection ||
            !this.migrationProcess ||
            !this.i18nPrefix ||
            !(this.filterSet || this.documentClass)
        ) {
            throw new Error(`Splittermond | Migration "${this.name}" is not fully configured.`);
        }
        return new Migrator(
            this.name,
            this.migrationDoneFlag,
            this.worldCollection,
            this.compendiumSource,
            this.migrationProcess,
            this.i18nPrefix,
            this.documentClass
        );
    }
}

export class Migrator<T extends FoundryDocument> {
    constructor(
        private readonly name: string,
        private readonly migrationSetting: MigrationSetting,
        private readonly worldCollection: () => Iterable<FoundryDocument>,
        private readonly compendiumSource: CompendiumSource,
        private readonly migrationProcess: MigrationProcess<T>,
        private readonly i18nPrefix: string,
        private readonly documentClass: string | null
    ) {}

    async run(options?: { force?: boolean }): Promise<MigrationResult> {
        if (!isFirstActiveGM(foundryApi.currentUser, foundryApi.users)) {
            return emptyMigrationResult();
        }
        if (!(await this.isMigrationFlagAvailable())) {
            return emptyMigrationResult();
        }
        if (!options?.force && this.migrationSetting.get()) {
            return emptyMigrationResult();
        }

        const result = emptyMigrationResult();
        const worldDocs = [...this.worldCollection()];
        const migratablePacks = await this.collectMigratablePacks(result);

        const total = worldDocs.length + migratablePacks.reduce((sum, p) => sum + p.size, 0);
        const reporter = new MigrationReporter(total, this.i18nPrefix);
        reporter.start();

        await this.migrateWorldDocuments(worldDocs, reporter, result);
        await this.migratePacks(migratablePacks, reporter, result);

        try {
            this.migrationSetting.set(true);
        } catch (error) {
            console.error(
                `Splittermond | migration "${this.name}": failed to persist the migration-done flag. The migration will run again.`,
                error
            );
        }
        reporter.stop();
        return result;
    }

    async promptAndRun(): Promise<void> {
        if (!isFirstActiveGM(foundryApi.currentUser, foundryApi.users)) return;
        if (!(await this.isMigrationFlagAvailable())) return;
        if (this.migrationSetting.get()) return;

        const content = foundryApi.localize(`${this.i18nPrefix}.dialog.content`);
        const dialog = new FoundryDialog({
            window: { title: `${this.i18nPrefix}.dialog.title` },
            position: { width: 600 },
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
                        void dialog.close();
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

    private async isMigrationFlagAvailable(): Promise<boolean> {
        await this.migrationSetting.ready();
        if (this.migrationSetting.isFunctional()) return true;
        console.error(
            `Splittermond | migration "${this.name}": the migration-done setting is unavailable. The migration is not started to avoid an endless migration loop.`
        );
        return false;
    }

    private async collectMigratablePacks(result: MigrationResult): Promise<MigratablePack[]> {
        const migratablePacks: MigratablePack[] = [];
        for (const pack of this.compendiumSource()) {
            if (isSystemPack(pack)) continue;
            if (pack.locked) {
                result.skippedPacks.push(pack.title);
                continue;
            }
            try {
                const index = await pack.getIndex();
                migratablePacks.push({ pack, size: index.size });
            } catch (error) {
                console.warn(
                    `Splittermond | migration "${this.name}": failed to load the index of compendium "${pack.title}". Skipping it.`,
                    error
                );
                result.skippedPacks.push(pack.title);
            }
        }
        return migratablePacks;
    }

    private async migrateWorldDocuments(
        worldDocs: FoundryDocument[],
        reporter: MigrationReporter,
        result: MigrationResult
    ): Promise<void> {
        for (const document of worldDocs) {
            try {
                result.worldDocumentsMigrated += await this.applyToDocumentTree(document, reporter);
            } catch (error) {
                this.logDocumentTreeFailure(error);
            }
        }
    }

    private async migratePacks(
        migratablePacks: MigratablePack[],
        reporter: MigrationReporter,
        result: MigrationResult
    ): Promise<void> {
        for (const { pack } of migratablePacks) {
            let docs: FoundryDocument[];
            try {
                docs = await pack.getDocuments();
            } catch (error) {
                console.warn(
                    `Splittermond | migration "${this.name}": failed to load the documents of compendium "${pack.title}". Skipping it.`,
                    error
                );
                result.skippedPacks.push(pack.title);
                continue;
            }
            let migratedAny = false;
            for (const doc of docs) {
                try {
                    if ((await this.applyToDocumentTree(doc, reporter)) > 0) {
                        migratedAny = true;
                    }
                } catch (error) {
                    this.logDocumentTreeFailure(error);
                }
            }
            if (migratedAny) result.packsMigrated += 1;
        }
    }

    private logDocumentTreeFailure(error: unknown): void {
        console.warn(
            `Splittermond | migration "${this.name}": failed to process a document tree. Continuing with the next document.`,
            error
        );
    }

    private async applyToDocumentTree(document: FoundryDocument, reporter: MigrationReporter): Promise<number> {
        let migratedCount = 0;
        if (this.matchesDocumentClass(document)) {
            if (await this.applyMigration(document as T)) {
                migratedCount += 1;
            }
        }
        reporter.updateProcessed();
        for (const [, embedded] of foundryApi.documents.traverseEmbeddedDocuments(document)) {
            if (this.matchesDocumentClass(embedded)) {
                if (await this.applyMigration(embedded as T)) {
                    migratedCount += 1;
                }
            }
            reporter.updateProcessed();
        }
        return migratedCount;
    }

    private matchesDocumentClass(document: FoundryDocument): boolean {
        return this.documentClass === null || document.documentName === this.documentClass;
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

function isSystemPack(pack: { metadata?: { packageType?: string } | null }): boolean {
    return pack.metadata?.packageType === "system";
}

function* filter<T>(source: Iterable<T>, predicate: (x: T) => boolean) {
    for (const item of source) {
        if (predicate(item)) {
            yield item;
        }
    }
}
