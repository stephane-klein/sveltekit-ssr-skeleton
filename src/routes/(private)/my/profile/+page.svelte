<script>
    let { form, data } = $props();
</script>

<svelte:head>
    <title>Profile — my-app</title>
</svelte:head>

<main class="page px-5 pt-9 pb-24">
    <h1 class="text-xl font-bold mb-7 tracking-tight">Profile</h1>

    <div class="mb-9">
        <h2 class="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3 pb-1.5 border-b border-gray-300">
            Personal information
        </h2>

        {#if form?.error}
            <p class="text-sm text-red-600 mb-3.5">{form.error}</p>
        {/if}

        {#if form?.saved}
            <p class="text-sm text-green-700 mb-3.5">Saved.</p>
        {/if}

        <form method="POST">
            <div class="mb-3.5">
                <label
                    for="display-name"
                    class="block text-sm font-semibold mb-1">Display name</label
                >
                <input
                    type="text"
                    id="display-name"
                    name="display-name"
                    value={data.user.display_name}
                    autocomplete="name"
                    class="w-full max-w-sm px-2 py-1.5 border border-gray-300 rounded-sm text-sm text-gray-900 bg-white focus:outline-2 focus:outline-blue-600 focus:border-blue-600"
                />
            </div>

            <div class="mb-3.5">
                <label
                    for="email"
                    class="block text-sm font-semibold mb-1">Email</label
                >
                <input
                    type="email"
                    id="email"
                    name="email"
                    value={data.user.email}
                    autocomplete="email"
                    class="w-full max-w-sm px-2 py-1.5 border border-gray-300 rounded-sm text-sm text-gray-900 bg-white focus:outline-2 focus:outline-blue-600 focus:border-blue-600"
                />
                <p class="text-xs text-gray-500 mt-1">Used for sign in and notifications.</p>
            </div>

            <div class="flex items-center gap-3 mt-1.5">
                <button
                    type="submit"
                    class="px-4 py-1.5 rounded-sm text-sm font-semibold cursor-pointer border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:border-blue-700"
                >
                    Save changes
                </button>
            </div>
        </form>
    </div>
</main>
