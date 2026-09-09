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
      d="M7 4.5h10a2 2 0 0 1 2 2v3.5H5V6.5a2 2 0 0 1 2-2z"
      :stroke="color"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <rect
      x="5"
      y="10"
      width="14"
      height="9.5"
      rx="2"
      :stroke="color"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M9 14.5h6M9 17.5h4"
      :stroke="color"
      stroke-width="2"
      stroke-linecap="round"
    />
    <path
      d="M9 4.5V3.75A1.25 1.25 0 0 1 10.25 2.5h3.5A1.25 1.25 0 0 1 15 3.75V4.5"
      :stroke="color"
      stroke-width="2"
      stroke-linecap="round"
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
