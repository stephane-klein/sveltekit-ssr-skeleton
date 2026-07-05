<svelte:head>
    <title>Dashboard — my-app</title>
</svelte:head>

<script>
let { data } = $props();
</script>

<main class="page px-5 pt-9 pb-24">
    <h1 class="text-xl font-bold mb-2 tracking-tight">Dashboard</h1>
    <p class="text-gray-500 text-sm mb-6">Welcome back, {data.user.display_name}.</p>

    <p class="text-sm text-gray-500">You are signed in as <strong>{data.user.email}</strong>.</p>
</main>
