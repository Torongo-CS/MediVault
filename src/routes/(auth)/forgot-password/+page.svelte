<script lang="ts">
  import ForgotPasswordForm from "$lib/components/forgot-password-form.svelte";

  let { form } = $props();
</script>

<ForgotPasswordForm {form} />
