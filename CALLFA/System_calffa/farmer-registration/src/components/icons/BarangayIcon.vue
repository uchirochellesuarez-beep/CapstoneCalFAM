<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M12 21s6.5-4.35 6.5-10a6.5 6.5 0 1 0-13 0c0 5.65 6.5 10 6.5 10z"
      :stroke="color"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle
      cx="12"
      cy="11"
      r="2.25"
      :stroke="color"
      stroke-width="1.75"
    />
  </svg>
</template>

<script setup>
defineProps({
  size: {
    type: [Number, String],
    default: 20
  },
  color: {
    type: String,
    default: 'currentColor'
  }
});
</script>
