<script>
import "uno.css";

let { children } = $props();
</script>

{@render children()}

<footer class="border-t border-gray-300">
    <div class="page px-5 py-3 text-xs text-gray-500">
        <a href="/docs" class="text-gray-500 no-underline hover:underline">Documentation</a>
        ·
        <a href="/about" class="text-gray-500 no-underline hover:underline">About</a>
        ·
        <a href="/api/reference" class="text-gray-500 no-underline hover:underline">API Reference</a>
    </div>
</footer>
