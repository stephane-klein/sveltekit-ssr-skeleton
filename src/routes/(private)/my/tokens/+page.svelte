<script>
    let { form, data } = $props();

    function confirmRevoke(e) {
        if (!confirm("Revoke this token?")) {
            e.preventDefault();
        }
    }
</script>

<svelte:head>
    <title>API Tokens — my-app</title>
</svelte:head>

<main class="page px-5 pt-9 pb-24">
    <h1 class="text-xl font-bold mb-7 tracking-tight">API Tokens</h1>

    {#if form?.created && form?.raw}
        <div class="mb-6 max-w-lg">
            <h2 class="text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">Token created</h2>
            <p class="text-xs text-gray-500 mb-2">Copy this token now — you won't be able to see it again.</p>
            <pre
                class="px-3 py-2 bg-gray-100 border border-gray-300 rounded-sm text-sm font-mono break-all">{form.raw}</pre>
        </div>
    {/if}

    {#if form?.deleted}
        <p class="text-sm text-green-700 mb-3.5">Token deleted.</p>
    {/if}

    {#if form?.error}
        <p class="text-sm text-red-600 mb-3.5">{form.error}</p>
    {/if}

    <div class="mb-9">
        <h2 class="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3 pb-1.5 border-b border-gray-300">
            Create token
        </h2>

        <form
            method="POST"
            action="?/create"
            class="max-w-sm"
        >
            <div class="mb-3">
                <label
                    for="name"
                    class="block text-sm font-semibold mb-1">Token name</label
                >
                <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="e.g. CI/CD deployment"
                    required
                    class="w-full px-2 py-1.5 border border-gray-300 rounded-sm text-sm text-gray-900 bg-white focus:outline-2 focus:outline-blue-600 focus:border-blue-600"
                />
            </div>
            <button
                type="submit"
                class="px-4 py-1.5 rounded-sm text-sm font-semibold cursor-pointer border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 hover:border-blue-700"
            >
                Create token
            </button>
        </form>
    </div>

    <div>
        <h2 class="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3 pb-1.5 border-b border-gray-300">
            Your tokens
        </h2>

        {#if data.tokens.length === 0}
            <p class="text-sm text-gray-500 italic">No tokens yet.</p>
        {:else}
            <table class="w-full text-sm border-collapse">
                <thead>
                    <tr>
                        <th
                            class="text-left text-xs font-bold uppercase tracking-wider text-gray-500 pb-1.5 border-b border-gray-300 pr-2"
                            >Name</th
                        >
                        <th
                            class="text-left text-xs font-bold uppercase tracking-wider text-gray-500 pb-1.5 border-b border-gray-300 pr-2"
                            >Created</th
                        >
                        <th
                            class="text-left text-xs font-bold uppercase tracking-wider text-gray-500 pb-1.5 border-b border-gray-300 pr-2"
                            >Last used</th
                        >
                        <th
                            class="text-right text-xs font-bold uppercase tracking-wider text-gray-500 pb-1.5 border-b border-gray-300"
                        ></th>
                    </tr>
                </thead>
                <tbody>
                    {#each data.tokens as token (token.id)}
                        <tr>
                            <td class="py-1.5 pr-2 border-b border-gray-200">{token.name}</td>
                            <td class="py-1.5 pr-2 border-b border-gray-200 text-gray-500 text-xs"
                                >{new Date(token.created_at).toLocaleDateString()}</td
                            >
                            <td class="py-1.5 pr-2 border-b border-gray-200 text-gray-500 text-xs"
                                >{token.last_used ? new Date(token.last_used).toLocaleDateString() : "—"}</td
                            >
                            <td class="py-1.5 border-b border-gray-200 text-right">
                                <form
                                    method="POST"
                                    action="?/delete"
                                    onsubmit={confirmRevoke}
                                >
                                    <input
                                        type="hidden"
                                        name="id"
                                        value={token.id}
                                    />
                                    <button
                                        type="submit"
                                        class="text-xs text-red-600 bg-transparent border-none cursor-pointer hover:underline"
                                    >
                                        revoke
                                    </button>
                                </form>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {/if}
    </div>
</main>
