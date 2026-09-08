import type { CompendiumFilter } from "module/migrations/Migrator";

export const isSplittermondPack: CompendiumFilter = (pack) => pack.metadata.system === "splittermond";
