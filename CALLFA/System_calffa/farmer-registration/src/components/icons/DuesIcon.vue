<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect
      x="3"
      y="6"
      width="13"
      height="14"
      rx="2"
      :stroke="color"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M7 4.5v3M12 4.5v3M3 10.5h13"
      :stroke="color"
      stroke-width="1.75"
      stroke-linecap="round"
    />
    <circle
      cx="18"
      cy="16"
      r="4.25"
      :stroke="color"
      stroke-width="1.75"
    />
    <path
      d="M16.75 16h2.5M18 14.75v2.5"
      :stroke="color"
      stroke-width="1.5"
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
