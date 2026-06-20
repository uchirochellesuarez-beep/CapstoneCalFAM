<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <!-- Loan application document -->
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

    <!-- Philippine Peso badge -->
    <circle
      cx="17.5"
      cy="17.5"
      r="4.35"
      :stroke="color"
      stroke-width="1.75"
    />
    <path
      d="M16.2 15.2v4.6"
      :stroke="color"
      stroke-width="1.35"
      stroke-linecap="round"
    />
    <path
      d="M14.9 16.55h3.6M14.9 18.05h3.6"
      :stroke="color"
      stroke-width="1.35"
      stroke-linecap="round"
    />
    <path
      d="M16.2 16.55h2.15a1.35 1.35 0 0 1 0 2.7h-2.15"
      :stroke="color"
      stroke-width="1.35"
      stroke-linecap="round"
      stroke-linejoin="round"
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
