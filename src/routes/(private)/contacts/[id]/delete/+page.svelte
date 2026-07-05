<svelte:head>
    <title>Delete contact — my-app</title>
</svelte:head>

<script>
    let { data } = $props()
</script>

<main class="page px-5 pt-9 pb-24">
    <h1 class="text-xl font-bold mb-6 tracking-tight">Delete contact</h1>

    <p class="text-sm text-gray-600 mb-4">
        Are you sure you want to delete <strong>{data.contact.firstname} {data.contact.lastname}</strong>? This cannot be undone.
    </p>

    <form method="POST">
        <div class="flex items-center gap-3">
            <button
                type="submit"
                class="px-4 py-1.5 rounded-sm text-sm font-semibold cursor-pointer border border-red-600 bg-red-600 text-white hover:bg-red-700 hover:border-red-700"
            >
                Yes, delete
            </button>
            <a href="/contacts" class="text-sm text-blue-600 hover:underline">Cancel</a>
        </div>
    </form>
</main>
