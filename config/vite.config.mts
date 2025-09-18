import { defineConfig, ResolvedConfig } from "vite";
import path from "path";
// @ts-ignore
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import fs from "fs/promises";

function packPacksPlugin() {
    let resolvedConfig: null | ResolvedConfig;
    return {
        name: "foundry-compendium-packer",
        configResolved(config: ResolvedConfig) {
            resolvedConfig = config;
        },
        async generateBundle() {
            if (!resolvedConfig) {
                throw new Error(
                    "Somehow there was no resolved config at the generate bundle step. " +
                        "I do not know where to place the packs now"
                );
            }
            const srcDir = path.join(resolvedConfig.root, "packs");
            const destDir = path.join(resolvedConfig.build.outDir, "packs");
            const packs = await fs.readdir(srcDir);

            await fs.mkdir(destDir, { recursive: true });

            for (const pack of packs) {
                const src = path.join(srcDir, pack);
                if (!(await fs.stat(src)).isDirectory()) continue;
                console.log(`Packing ${pack}`);
                await compilePack(src, path.join(destDir, pack), { yaml: true });
            }
        },
    };
}
export default defineConfig({
    root: path.resolve(__dirname, "../src/"),
    publicDir: path.resolve(__dirname, "../public"),
    base: "/systems/splittermond/",
    plugins: [packPacksPlugin()],
    server: {
        port: 30001,
        open: true,
        proxy: {
            "^(?!/systems/splittermond)": "http://localhost:30000/",
            "/socket.io": {
                target: "ws://localhost:30000",
                ws: true,
            },
        },
    },
    css: {
        preprocessorOptions: {
            less: {
                math: "always",
                relativeUrls: true,
                javascriptEnabled: true,
            },
        },
    },
    resolve: {
        alias: {
            module: path.resolve(__dirname, "../src/module"),
        },
    },
    esbuild: {
        minifyWhitespace: true,
        minifyIdentifiers: true,
        minifySyntax: true,
        keepNames: true,
    },
    build: {
        outDir: path.resolve(__dirname, "../dist"),
        emptyOutDir: true,
        sourcemap: true,
        lib: {
            name: "splittermond",
            entry: "splittermond.js",
            formats: ["es"],
            fileName: "splittermond",
        },
        minify: "esbuild",
        rollupOptions: {
            output: {
                assetFileNames: (chunkInfo) => {
                    if (chunkInfo.names.includes("style.css")) return "splittermond.css";
                    else {
                        return chunkInfo.names?.[0] ?? "";
                    }
                },
            },
        },
    },
});
