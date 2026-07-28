<script lang="ts">
  import RegisterForm from "$lib/components/register-form.svelte";

  let { form } = $props();
</script>

<RegisterForm {form} />
