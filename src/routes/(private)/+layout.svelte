<script>
    let { children } = $props();
</script>

<header class="border-b border-gray-300">
    <div class="page px-5 py-2 flex items-center justify-between">
        <a
            href="/dashboard"
            class="font-bold text-base no-underline">my-app</a
        >
        <nav>
            <a
                href="/dashboard"
                class="text-sm text-gray-500 no-underline hover:text-blue-600 hover:underline">Dashboard</a
            >
            ·
            <a
                href="/contacts"
                class="text-sm text-gray-500 no-underline hover:text-blue-600 hover:underline">Contacts</a
            >
            ·
            <a
                href="/my/profile"
                class="text-sm text-gray-500 no-underline hover:text-blue-600 hover:underline">Profile</a
            >
            ·
            <a
                href="/my/tokens"
                class="text-sm text-gray-500 no-underline hover:text-blue-600 hover:underline">Tokens</a
            >
            ·
            <a
                href="/logout"
                class="text-sm text-gray-500 no-underline hover:text-blue-600 hover:underline">Sign out</a
            >
        </nav>
    </div>
</header>

{@render children()}
