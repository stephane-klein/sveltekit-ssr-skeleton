<script>
    let { form } = $props();
</script>

<svelte:head>
    <title>Create account — my-app</title>
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
    <h1 class="text-xl font-bold mb-6 tracking-tight">Create account</h1>

    {#if form?.error}
        <p class="text-sm text-red-600 mb-3.5">{form.error}</p>
    {/if}

    <form
        method="POST"
        class="max-w-sm"
        novalidate
    >
        <div class="mb-3">
            <label
                for="email"
                class="block text-sm font-semibold mb-1">Email</label
            >
            <!-- svelte-ignore a11y_autofocus -->
            <input
                type="email"
                id="email"
                name="email"
                autocomplete="email"
                autofocus
                required
                class="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-sm text-gray-900 bg-white focus:outline-2 focus:outline-blue-600 focus:border-blue-600"
            />
        </div>

        <div class="mb-3">
            <label
                for="display-name"
                class="block text-sm font-semibold mb-1"
            >
                Display name <span class="font-normal text-gray-500">(optional)</span>
            </label>
            <input
                type="text"
                id="display-name"
                name="display-name"
                autocomplete="name"
                class="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-sm text-gray-900 bg-white focus:outline-2 focus:outline-blue-600 focus:border-blue-600"
            />
        </div>

        <div class="mb-3">
            <label
                for="password"
                class="block text-sm font-semibold mb-1">Password</label
            >
            <input
                type="password"
                id="password"
                name="password"
                autocomplete="new-password"
                required
                class="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-sm text-gray-900 bg-white focus:outline-2 focus:outline-blue-600 focus:border-blue-600"
            />
            <p class="text-xs text-gray-500 mt-1">At least 12 characters.</p>
        </div>

        <div class="mt-4">
            <button
                type="submit"
                class="px-4 py-1.5 bg-blue-600 text-white border border-blue-600 rounded-sm text-sm font-semibold cursor-pointer hover:bg-blue-700 hover:border-blue-700"
            >
                Create account
            </button>
        </div>
    </form>

    <p class="mt-5 pt-4 border-t border-gray-300 text-sm text-gray-500">
        Already have an account?
        <a
            href="/login"
            class="text-blue-600 hover:underline">Sign in</a
        >
        ·
        <a
            href="/"
            class="text-blue-600 hover:underline">Back to homepage</a
        >
    </p>
</main>
