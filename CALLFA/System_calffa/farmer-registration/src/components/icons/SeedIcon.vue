<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <!-- Seed sprout -->
    <path
      d="M5.5 19.5V12"
      :stroke="color"
      stroke-width="1.75"
      stroke-linecap="round"
    />
    <path
      d="M5.5 14.25c-1.65-1.1-2.35-2.75-2.1-4.1.3-1.75 1.85-2.9 3.35-2.35"
      :stroke="color"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M5.5 14.25c1.65-1.1 2.35-2.75 2.1-4.1-.3-1.75-1.85-2.9-3.35-2.35"
      :stroke="color"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <ellipse
      cx="5.5"
      cy="7.15"
      rx="1.35"
      ry="0.85"
      :stroke="color"
      stroke-width="1.5"
    />

    <!-- Fertilizer / seed sack -->
    <path
      d="M12.25 6.25h5.5l1.75 13H10.5l1.75-13z"
      :stroke="color"
      stroke-width="1.75"
      stroke-linejoin="round"
    />
    <path
      d="M11.75 6.25c.85-1.1 2.15-1.75 3.5-1.75s2.65.65 3.5 1.75"
      :stroke="color"
      stroke-width="1.75"
      stroke-linecap="round"
    />
    <path
      d="M12.75 11h4.5M12.75 14h4.5M12.75 17h4.5"
      :stroke="color"
      stroke-width="1.35"
      stroke-linecap="round"
      opacity="0.85"
    />

    <!-- Grain dots on sack -->
    <circle cx="14.25" cy="9.1" r="0.65" :fill="color" />
    <circle cx="16.1" cy="9.55" r="0.65" :fill="color" />
    <circle cx="15.1" cy="10.45" r="0.65" :fill="color" />
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
