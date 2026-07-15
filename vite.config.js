import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { sveltekit } from "@sveltejs/kit/vite";
import UnoCSS from "unocss/vite";

/** @type {import('vite').UserConfig} */
const config = {
    plugins: [
        UnoCSS(),
        sveltekit(),
        paraglideVitePlugin({
            project: "./project.inlang",
            outdir: "./src/lib/paraglide",
            strategy: ["baseLocale"],
        }),
    ],
    server: { host: "0.0.0.0", allowedHosts: true },
};

export default config;
