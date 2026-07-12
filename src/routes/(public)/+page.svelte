<svelte:head>
    <title>Home — my-app</title>
</svelte:head>

<header class="border-b border-gray-300">
    <div class="page px-5 py-2 flex items-center justify-between">
        <a
            href="/"
            class="font-bold text-base no-underline">my-app</a
        >
        <nav>
            <a
                href="/login"
                class="text-sm text-gray-500 no-underline hover:text-blue-600 hover:underline">Sign in</a
            >
            ·
            <a
                href="/signup"
                class="text-sm text-gray-500 no-underline hover:text-blue-600 hover:underline">Create account</a
            >
        </nav>
    </div>
</header>

<main class="page px-5 pt-12 pb-24">
    <h1 class="text-2xl font-bold mb-4 tracking-tight">my-app</h1>
    <p class="text-gray-500 mb-6 max-w-lg">
        Welcome to my-app. Sign in to access your dashboard and manage your account.
    </p>
    <a
        href="/login"
        class="px-4 py-1.5 bg-blue-600 text-white border border-blue-600 rounded-sm text-sm font-semibold no-underline inline-block hover:bg-blue-700"
        >Sign in</a
    >
</main>
