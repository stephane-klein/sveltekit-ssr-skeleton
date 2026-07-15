<script>
    let { data } = $props();
</script>

<svelte:head>
    <title>Check your email — my-app</title>
</svelte:head>

<header class="border-b border-gray-300">
    <div class="page px-5 py-2">
        <a
            href="/"
            class="font-bold text-base no-underline hover:underline">my-app</a
        >
    </div>
</header>

<main class="page px-5 pt-9 pb-24">
    <h1 class="text-xl font-bold mb-2 tracking-tight">Check your email</h1>

    <p class="text-sm mb-6 max-w-sm">
        We sent a magic link to <strong class="font-mono">{data.email}</strong>.
    </p>

    <p class="text-xs text-gray-500 mb-2 max-w-sm">Click the link in the email to sign in. It expires in 15 minutes.</p>

    <p class="text-sm text-gray-500">
        <a
            href="/login"
            class="text-blue-600 hover:underline">Try a different email</a
        >
        ·
        <a
            href="/"
            class="text-blue-600 hover:underline">Go to homepage</a
        >
    </p>
</main>
