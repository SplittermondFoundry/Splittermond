// Stub for the `fvtt-types` package (pulled in transitively by @ethaks/fvtt-quench).
// fvtt-types declares its own global `const CONFIG`, which clashes with the
// hand-maintained `CONFIG` in foundryTypes.ts. We keep the local Foundry types
// (see AGENTS.md API-isolation rule) as the single source, so this stub redirects
// the `fvtt-types/*` subpaths that fvtt-quench's .d.ts files import to minimal
// local definitions, preventing fvtt-types' global CONFIG from entering the program.
// Mapped via tsconfig.json `paths`.
declare module "fvtt-types/utils" {
    export type AnyObject = {
        readonly [K: string]: unknown;
    };
    type AnyConstructor = abstract new (...args: never) => unknown;
    type AnyConcreteConstructor = new (...args: never) => unknown;
    type MixinClass = abstract new (...args: never) => unknown;
    export type Mixin<MixinClass extends AnyConcreteConstructor, BaseClass extends AnyConstructor> = MixinClass &
        BaseClass;
}

declare module "fvtt-types/configuration" {}
