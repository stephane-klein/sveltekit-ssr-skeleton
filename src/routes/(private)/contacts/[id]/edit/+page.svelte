<script>
    let { form, data } = $props();
</script>

<svelte:head>
    <title>Edit contact — my-app</title>
</svelte:head>

<main class="page px-5 pt-9 pb-24">
    <h1 class="text-xl font-bold mb-6 tracking-tight">Edit contact</h1>

    {#if form?.error}
        <p class="text-sm text-red-600 mb-3.5">{form.error}</p>
    {/if}

    <form
        method="POST"
        class="max-w-sm"
    >
        <div class="mb-3">
            <label
                for="firstname"
                class="block text-sm font-semibold mb-1">First name</label
            >
            <input
                type="text"
                id="firstname"
                name="firstname"
                value={data.contact.firstname}
                autocomplete="off"
                autofocus
                required
                class="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-sm text-gray-900 bg-white focus:outline-2 focus:outline-blue-600 focus:border-blue-600"
            />
        </div>

        <div class="mb-3">
            <label
                for="lastname"
                class="block text-sm font-semibold mb-1">Last name</label
            >
            <input
                type="text"
                id="lastname"
                name="lastname"
                value={data.contact.lastname}
                autocomplete="off"
                required
                class="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-sm text-gray-900 bg-white focus:outline-2 focus:outline-blue-600 focus:border-blue-600"
            />
        </div>

        <div class="flex items-center gap-3 mt-4">
            <button
                type="submit"
                class="px-4 py-1.5 rounded-sm text-sm font-semibold cursor-pointer border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:border-blue-700"
            >
                Save
            </button>
            <a
                href="/contacts"
                class="text-sm text-blue-600 hover:underline">Cancel</a
            >
        </div>
    </form>
</main>
