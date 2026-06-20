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
      d="M10.5 4.5h6.75A1.75 1.75 0 0 1 19 6.25V17"
      :stroke="color"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      opacity="0.55"
    />
    <rect
      x="5"
      y="7"
      width="12"
      height="14"
      rx="2"
      :stroke="color"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle cx="8" cy="11.5" r="0.9" :fill="color" />
    <path
      d="M10.75 11.5h4.75"
      :stroke="color"
      stroke-width="1.75"
      stroke-linecap="round"
    />
    <circle cx="8" cy="15" r="0.9" :fill="color" />
    <path
      d="M10.75 15h4.75"
      :stroke="color"
      stroke-width="1.75"
      stroke-linecap="round"
    />
    <circle cx="8" cy="18.5" r="0.9" :fill="color" />
    <path
      d="M10.75 18.5h3.25"
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
