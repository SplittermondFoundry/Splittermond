import { foundryApi } from "module/api/foundryApi";
import { FoundryDialog } from "module/api/Application";
import { isFirstActiveGM } from "module/util/foundryUserUtils";
import { settings } from "module/settings";
import { MigrationReporter } from "module/migrations/MigrationReporter";
import {pipe} from "module/util/util";

type MigrationSetting = Awaited<ReturnType<typeof settings.registerBoolean>>;

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

function emptyMigrationResult(): MigrationResult {
    return { worldDocumentsMigrated: 0, packsMigrated: 0, skippedPacks: [] };
}

export class MigrationBuilder<T extends FoundryDocument> {
    private resolvedSetting: MigrationSetting | null = null;
    private worldCollection: (() => Iterable<T>) | null = null;
    private compendiumSource: CompendiumSource = () => foundryApi.collections.packs;
    private migrationProcess: MigrationProcess<T> | null = null;
    private i18nPrefix: string | null = null;
    private filterSet:boolean = false;

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

    withWorldCollection(worldCollection: () => Iterable<T>): this {
        this.worldCollection = worldCollection;
        return this;
    }

    withCompendiumFilter(compendiumFilter: CompendiumFilter): this {
        const previousSource = this.compendiumSource;
        this.compendiumSource = pipe(previousSource, (source)=>filter(source,compendiumFilter))
        this.filterSet = true;
        return this;
    }

    withDocumentClass(documentClass: string): this {
        return this.withCompendiumFilter((pack) => pack.documentName === documentClass);
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
        if (!this.worldCollection || !this.filterSet|| !this.migrationProcess || !this.i18nPrefix) {
            throw new Error(`Splittermond | Migration "${this.name}" is not fully configured.`);
        }
        return new Migrator(
            this.name,
            this.migrationDoneFlag,
            this.worldCollection,
            this.compendiumSource,
            this.migrationProcess,
            this.i18nPrefix
        );
    }
}

export class Migrator<T extends FoundryDocument> {
    constructor(
        private readonly name: string,
        private readonly migrationSetting: MigrationSetting,
        private readonly worldCollection: () => Iterable<T>,
        private readonly compendiumSource: CompendiumSource,
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
        const worldDocs = [...this.worldCollection()];
        const migratablePacks: { pack: foundry.documents.collections.CompendiumCollection; size: number }[] = [];

        for (const pack of this.compendiumSource()) {
            if (isSystemPack(pack)) continue;
            if (pack.locked) {
                result.skippedPacks.push(pack.title);
                continue;
            }
            const index = await pack.getIndex();
            migratablePacks.push({ pack, size: index.size });
        }

        const total = worldDocs.length + migratablePacks.reduce((sum, p) => sum + p.size, 0);
        const reporter = new MigrationReporter(total, this.i18nPrefix);
        reporter.start();

        for (const document of worldDocs) {
            if (await this.applyMigration(document)) {
                result.worldDocumentsMigrated += 1;
            }
            reporter.updateProcessed();
        }
        for (const { pack } of migratablePacks) {
            const docs = await pack.getDocuments();
            let migratedAny = false;
            for (const doc of docs) {
                if (await this.applyMigration(doc as T)) {
                    migratedAny = true;
                }
                reporter.updateProcessed();
            }
            if (migratedAny) result.packsMigrated += 1;
        }

        this.migrationSetting.set(true);
        reporter.stop();
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

function* filter<T>(source: Iterable<T>, predicate:(x:T)=>boolean) {
    for(const item of source){
        if (predicate(item)){
            yield item;
        }
    }
}
