<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <ellipse cx="9" cy="8" rx="6" ry="2.5" :stroke="color" stroke-width="2" />
    <path d="M3 8v4c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5V8" :stroke="color" stroke-width="2" />
    <path d="M3 12v4c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5v-4" :stroke="color" stroke-width="2" />
    <ellipse cx="15" cy="5" rx="5" ry="2" :stroke="color" stroke-width="2" />
    <path d="M10 5v2.5c0 1.1 2.24 2 5 2s5-.9 5-2V5" :stroke="color" stroke-width="2" />
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
