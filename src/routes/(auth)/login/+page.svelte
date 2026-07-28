<script lang="ts">
  import LoginForm from "$lib/components/login-form.svelte";

  let { data, form } = $props();
</script>

<LoginForm {form} redirectTo={data.redirectTo} />
