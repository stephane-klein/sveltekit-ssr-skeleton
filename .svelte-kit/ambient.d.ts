
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * Environment variables [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env`. Like [`$env/dynamic/private`](https://kit.svelte.dev/docs/modules#$env-dynamic-private), this module cannot be imported into client-side code. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://kit.svelte.dev/docs/configuration#env).
 * 
 * _Unlike_ [`$env/dynamic/private`](https://kit.svelte.dev/docs/modules#$env-dynamic-private), the values exported from this module are statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * ```ts
 * import { API_KEY } from '$env/static/private';
 * ```
 * 
 * Note that all environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * 
 * ```
 * MY_FEATURE_FLAG=""
 * ```
 * 
 * You can override `.env` values from the command line like so:
 * 
 * ```bash
 * MY_FEATURE_FLAG="enabled" npm run dev
 * ```
 */
declare module '$env/static/private' {
	export const SHELL: string;
	export const LSCOLORS: string;
	export const npm_command: string;
	export const SESSION_MANAGER: string;
	export const COLORTERM: string;
	export const LESS: string;
	export const HISTCONTROL: string;
	export const XDG_MENU_PREFIX: string;
	export const TERM_PROGRAM_VERSION: string;
	export const TMUX: string;
	export const HISTSIZE: string;
	export const HOSTNAME: string;
	export const NODE: string;
	export const WISECONFIGDIR: string;
	export const GUESTFISH_OUTPUT: string;
	export const SSH_AUTH_SOCK: string;
	export const XDG_DATA_HOME: string;
	export const npm_package_private: string;
	export const XMODIFIERS: string;
	export const DESKTOP_SESSION: string;
	export const EDITOR: string;
	export const PWD: string;
	export const npm_package_scripts_prettier: string;
	export const npm_package_devDependencies_vite: string;
	export const LOGNAME: string;
	export const XDG_SESSION_DESKTOP: string;
	export const XDG_SESSION_TYPE: string;
	export const SYSTEMD_EXEC_PID: string;
	export const npm_package_scripts_build: string;
	export const XAUTHORITY: string;
	export const FZF_DEFAULT_COMMAND: string;
	export const GUESTFISH_RESTORE: string;
	export const GJS_DEBUG_TOPICS: string;
	export const GDM_LANG: string;
	export const HOME: string;
	export const USERNAME: string;
	export const LANG: string;
	export const LS_COLORS: string;
	export const XDG_CURRENT_DESKTOP: string;
	export const npm_package_version: string;
	export const STARSHIP_SHELL: string;
	export const WAYLAND_DISPLAY: string;
	export const npm_package_scripts_migrate_init: string;
	export const GUESTFISH_PS1: string;
	export const npm_package_scripts_migrate_watch: string;
	export const INVOCATION_ID: string;
	export const MANAGERPID: string;
	export const npm_package_scripts_migrate_status: string;
	export const INIT_CWD: string;
	export const STARSHIP_SESSION_KEY: string;
	export const npm_package_dependencies_graphile_migrate: string;
	export const npm_package_scripts_preview: string;
	export const ALACRITTY_SOCKET: string;
	export const npm_lifecycle_script: string;
	export const GJS_DEBUG_OUTPUT: string;
	export const MOZ_GMP_PATH: string;
	export const GNOME_SETUP_DISPLAY: string;
	export const NPM_CONFIG_PREFIX: string;
	export const XDG_SESSION_CLASS: string;
	export const TERM: string;
	export const npm_package_name: string;
	export const ZSH: string;
	export const npm_config_prefix: string;
	export const ASDF_DIR: string;
	export const LESSOPEN: string;
	export const npm_package_type: string;
	export const USER: string;
	export const TMUX_PANE: string;
	export const npm_package_dependencies_pg: string;
	export const DISPLAY: string;
	export const npm_lifecycle_event: string;
	export const SHLVL: string;
	export const PAGER: string;
	export const GUESTFISH_INIT: string;
	export const QT_IM_MODULE: string;
	export const npm_package_scripts_prettier_check: string;
	export const npm_config_user_agent: string;
	export const npm_package_scripts_migrate_commit: string;
	export const PNPM_SCRIPT_SRC_DIR: string;
	export const npm_execpath: string;
	export const npm_package_devDependencies__sveltejs_adapter_auto: string;
	export const npm_package_devDependencies_svelte: string;
	export const npm_package_scripts_migrate_migrate: string;
	export const XDG_RUNTIME_DIR: string;
	export const NODE_PATH: string;
	export const npm_package_scripts_migrate_reset: string;
	export const DEBUGINFOD_URLS: string;
	export const npm_package_scripts_dev: string;
	export const JOURNAL_STREAM: string;
	export const XDG_DATA_DIRS: string;
	export const PATH: string;
	export const npm_config_node_gyp: string;
	export const ALACRITTY_LOG: string;
	export const GDMSESSION: string;
	export const npm_package_devDependencies__sveltejs_kit: string;
	export const DBUS_SESSION_BUS_ADDRESS: string;
	export const MAIL: string;
	export const npm_config_registry: string;
	export const GIO_LAUNCHED_DESKTOP_FILE_PID: string;
	export const npm_node_execpath: string;
	export const GIO_LAUNCHED_DESKTOP_FILE: string;
	export const OLDPWD: string;
	export const TERM_PROGRAM: string;
	export const NODE_ENV: string;
}

/**
 * Similar to [`$env/static/private`](https://kit.svelte.dev/docs/modules#$env-static-private), except that it only includes environment variables that begin with [`config.kit.env.publicPrefix`](https://kit.svelte.dev/docs/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Values are replaced statically at build time.
 * 
 * ```ts
 * import { PUBLIC_BASE_URL } from '$env/static/public';
 * ```
 */
declare module '$env/static/public' {

}

/**
 * This module provides access to runtime environment variables, as defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/master/packages/adapter-node) (or running [`vite preview`](https://kit.svelte.dev/docs/cli)), this is equivalent to `process.env`. This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://kit.svelte.dev/docs/configuration#env).
 * 
 * This module cannot be imported into client-side code.
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * console.log(env.DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 * 
 * > In `dev`, `$env/dynamic` always includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 */
declare module '$env/dynamic/private' {
	export const env: {
		SHELL: string;
		LSCOLORS: string;
		npm_command: string;
		SESSION_MANAGER: string;
		COLORTERM: string;
		LESS: string;
		HISTCONTROL: string;
		XDG_MENU_PREFIX: string;
		TERM_PROGRAM_VERSION: string;
		TMUX: string;
		HISTSIZE: string;
		HOSTNAME: string;
		NODE: string;
		WISECONFIGDIR: string;
		GUESTFISH_OUTPUT: string;
		SSH_AUTH_SOCK: string;
		XDG_DATA_HOME: string;
		npm_package_private: string;
		XMODIFIERS: string;
		DESKTOP_SESSION: string;
		EDITOR: string;
		PWD: string;
		npm_package_scripts_prettier: string;
		npm_package_devDependencies_vite: string;
		LOGNAME: string;
		XDG_SESSION_DESKTOP: string;
		XDG_SESSION_TYPE: string;
		SYSTEMD_EXEC_PID: string;
		npm_package_scripts_build: string;
		XAUTHORITY: string;
		FZF_DEFAULT_COMMAND: string;
		GUESTFISH_RESTORE: string;
		GJS_DEBUG_TOPICS: string;
		GDM_LANG: string;
		HOME: string;
		USERNAME: string;
		LANG: string;
		LS_COLORS: string;
		XDG_CURRENT_DESKTOP: string;
		npm_package_version: string;
		STARSHIP_SHELL: string;
		WAYLAND_DISPLAY: string;
		npm_package_scripts_migrate_init: string;
		GUESTFISH_PS1: string;
		npm_package_scripts_migrate_watch: string;
		INVOCATION_ID: string;
		MANAGERPID: string;
		npm_package_scripts_migrate_status: string;
		INIT_CWD: string;
		STARSHIP_SESSION_KEY: string;
		npm_package_dependencies_graphile_migrate: string;
		npm_package_scripts_preview: string;
		ALACRITTY_SOCKET: string;
		npm_lifecycle_script: string;
		GJS_DEBUG_OUTPUT: string;
		MOZ_GMP_PATH: string;
		GNOME_SETUP_DISPLAY: string;
		NPM_CONFIG_PREFIX: string;
		XDG_SESSION_CLASS: string;
		TERM: string;
		npm_package_name: string;
		ZSH: string;
		npm_config_prefix: string;
		ASDF_DIR: string;
		LESSOPEN: string;
		npm_package_type: string;
		USER: string;
		TMUX_PANE: string;
		npm_package_dependencies_pg: string;
		DISPLAY: string;
		npm_lifecycle_event: string;
		SHLVL: string;
		PAGER: string;
		GUESTFISH_INIT: string;
		QT_IM_MODULE: string;
		npm_package_scripts_prettier_check: string;
		npm_config_user_agent: string;
		npm_package_scripts_migrate_commit: string;
		PNPM_SCRIPT_SRC_DIR: string;
		npm_execpath: string;
		npm_package_devDependencies__sveltejs_adapter_auto: string;
		npm_package_devDependencies_svelte: string;
		npm_package_scripts_migrate_migrate: string;
		XDG_RUNTIME_DIR: string;
		NODE_PATH: string;
		npm_package_scripts_migrate_reset: string;
		DEBUGINFOD_URLS: string;
		npm_package_scripts_dev: string;
		JOURNAL_STREAM: string;
		XDG_DATA_DIRS: string;
		PATH: string;
		npm_config_node_gyp: string;
		ALACRITTY_LOG: string;
		GDMSESSION: string;
		npm_package_devDependencies__sveltejs_kit: string;
		DBUS_SESSION_BUS_ADDRESS: string;
		MAIL: string;
		npm_config_registry: string;
		GIO_LAUNCHED_DESKTOP_FILE_PID: string;
		npm_node_execpath: string;
		GIO_LAUNCHED_DESKTOP_FILE: string;
		OLDPWD: string;
		TERM_PROGRAM: string;
		NODE_ENV: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: string]: string | undefined;
	}
}

/**
 * Similar to [`$env/dynamic/private`](https://kit.svelte.dev/docs/modules#$env-dynamic-private), but only includes variables that begin with [`config.kit.env.publicPrefix`](https://kit.svelte.dev/docs/configuration#env) (which defaults to `PUBLIC_`), and can therefore safely be exposed to client-side code.
 * 
 * Note that public dynamic environment variables must all be sent from the server to the client, causing larger network requests — when possible, use `$env/static/public` instead.
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.PUBLIC_DEPLOYMENT_SPECIFIC_VARIABLE);
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
