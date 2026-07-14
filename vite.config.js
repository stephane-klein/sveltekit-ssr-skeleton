import { sveltekit } from "@sveltejs/kit/vite";
import UnoCSS from "unocss/vite";

/** @type {import('vite').UserConfig} */
const config = {
    plugins: [UnoCSS(), sveltekit()],
    server: {
        host: "0.0.0.0",
        allowedHosts: true,
    },
};

export default config;
