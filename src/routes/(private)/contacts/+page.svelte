<script>
    let { data } = $props();
</script>

<svelte:head>
    <title>Contacts — my-app</title>
</svelte:head>

<main class="page px-5 pt-9 pb-24">
    <div class="flex items-baseline gap-3 mb-6">
        <h1 class="text-xl font-bold tracking-tight">Contacts</h1>
        <a
            href="/contacts/new"
            class="px-3 py-1 rounded-sm text-sm font-semibold no-underline border border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
            >+ New</a
        >
    </div>

    {#if data.contacts.length === 0}
        <p class="text-sm text-gray-500 italic">No contacts yet.</p>
    {:else}
        <table class="w-full text-sm border-collapse">
            <thead>
                <tr>
                    <th
                        class="text-left text-xs font-bold uppercase tracking-wider text-gray-500 pb-1.5 pr-2 border-b-2 border-gray-300"
                        >ID</th
                    >
                    <th
                        class="text-left text-xs font-bold uppercase tracking-wider text-gray-500 pb-1.5 pr-2 border-b-2 border-gray-300"
                        >First name</th
                    >
                    <th
                        class="text-left text-xs font-bold uppercase tracking-wider text-gray-500 pb-1.5 pr-2 border-b-2 border-gray-300"
                        >Last name</th
                    >
                    <th
                        class="text-left text-xs font-bold uppercase tracking-wider text-gray-500 pb-1.5 pr-2 border-b-2 border-gray-300"
                        >Created</th
                    >
                    <th
                        class="text-right text-xs font-bold uppercase tracking-wider text-gray-500 pb-1.5 border-b-2 border-gray-300"
                    ></th>
                </tr>
            </thead>
            <tbody>
                {#each data.contacts as contact (contact.id)}
                    <tr class="hover:bg-gray-50">
                        <td class="py-1.5 pr-2 border-b border-gray-200 font-mono text-xs text-gray-500"
                            >{contact.id}</td
                        >
                        <td class="py-1.5 pr-2 border-b border-gray-200">{contact.firstname}</td>
                        <td class="py-1.5 pr-2 border-b border-gray-200">{contact.lastname}</td>
                        <td class="py-1.5 pr-2 border-b border-gray-200 text-gray-500"
                            >{new Date(contact.created_at).toLocaleDateString()}</td
                        >
                        <td class="py-1.5 border-b border-gray-200 text-right whitespace-nowrap">
                            <a
                                href="/contacts/{contact.id}/edit"
                                class="text-xs text-gray-500 no-underline hover:text-blue-600 hover:underline">edit</a
                            >
                            <span class="text-gray-300 mx-1">·</span>
                            <a
                                href="/contacts/{contact.id}/delete"
                                class="text-xs text-red-600 no-underline hover:underline">delete</a
                            >
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
</main>
