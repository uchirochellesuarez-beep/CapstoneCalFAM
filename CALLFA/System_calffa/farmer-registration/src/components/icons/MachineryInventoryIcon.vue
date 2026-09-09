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
      d="M4 8.5h16M4 14h16M6 8.5V19M18 8.5V19M4 19h16"
      :stroke="color"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <rect
      x="7.5"
      y="10.5"
      width="4.5"
      height="3.25"
      rx="0.75"
      :stroke="color"
      stroke-width="1.75"
    />
    <rect
      x="13"
      y="10.5"
      width="4.5"
      height="3.25"
      rx="0.75"
      :stroke="color"
      stroke-width="1.75"
    />
    <rect
      x="8.75"
      y="15.25"
      width="6.5"
      height="3.25"
      rx="0.75"
      :stroke="color"
      stroke-width="1.75"
    />
    <circle
      cx="12"
      cy="5.25"
      r="2.35"
      :stroke="color"
      stroke-width="1.75"
    />
    <path
      d="M12 3.25v4M10.35 4.9h3.3M10.35 5.6h3.3"
      :stroke="color"
      stroke-width="1.35"
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
