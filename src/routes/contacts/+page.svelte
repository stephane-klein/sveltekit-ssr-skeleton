<script>
let { data } = $props();
let { contacts } = data;
</script>

<h1>Contacts</h1>

<table>
    <thead>
        <tr>
            <th>ID</th>
            <th>First name</th>
            <th>Last name</th>
            <th>Created at</th>
        </tr>
    </thead>
    <tbody>
        {#each contacts as contact}
            <tr>
                <td>{contact.id}</td>
                <td>{contact.firstname}</td>
                <td>{contact.lastname}</td>
                <td>{contact.created_at}</td>
            </tr>
        {/each}
    </tbody>
</table>
