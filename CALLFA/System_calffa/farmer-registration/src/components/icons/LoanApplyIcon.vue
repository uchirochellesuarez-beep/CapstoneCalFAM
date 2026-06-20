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
      d="M9 4.5h6a1.25 1.25 0 0 1 1.25 1.25V7H7.75V5.75A1.25 1.25 0 0 1 9 4.5z"
      :stroke="color"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <rect
      x="5"
      y="7"
      width="11"
      height="14"
      rx="2"
      :stroke="color"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M8 11h5M8 14.5h3.5"
      :stroke="color"
      stroke-width="1.75"
      stroke-linecap="round"
    />
    <circle
      cx="17.5"
      cy="17.5"
      r="4.25"
      :stroke="color"
      stroke-width="1.75"
    />
    <path
      d="M17.5 15.5v4M15.5 17.5h4"
      :stroke="color"
      stroke-width="1.75"
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
