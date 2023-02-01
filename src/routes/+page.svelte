<script lang="js">
    export let data;
</script>

<h1>Users</h1>

<ul>
    {#each data.users as user}
        <li>{user.id} - {user.username}</li>
    {/each}
</ul>
