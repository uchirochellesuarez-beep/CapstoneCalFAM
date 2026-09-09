<template>
  <div class="landing-page" :class="{ 'light-theme': isLight }">
    <div class="page-backdrop" aria-hidden="true">
      <img
        :src="dashboardSrc"
        alt=""
        class="bg-dashboard"
      />
      <img
        :src="farmerPhoto"
        alt=""
        class="bg-farmer"
      />
      <div class="bg-overlay"></div>
    </div>

    <header class="landing-nav">
      <div class="nav-inner">
        <a href="#hero" class="nav-brand" @click.prevent="scrollTo('hero')">
          <img :src="calffaLogo" :alt="t('brand.name')" class="nav-logo" />
          <span class="nav-brand-text">
            <span class="nav-brand-name">{{ t('brand.name') }}</span>
            <span class="nav-brand-tagline">{{ t('brand.tagline') }}</span>
          </span>
        </a>

        <nav class="nav-links" :aria-label="t('landing.pageNav')">
          <a href="#about" class="nav-text-link" @click.prevent="scrollTo('about')">{{ t('landing.navAbout') }}</a>
          <a href="#features" class="nav-text-link" @click.prevent="scrollTo('features')">{{ t('landing.navFeatures') }}</a>
          <a href="#helps" class="nav-text-link" @click.prevent="scrollTo('helps')">{{ t('landing.navHelp') }}</a>
        </nav>

        <div class="nav-controls">
          <ThemeToggle variant="floating" />
          <LanguageToggle variant="floating" />
        </div>
      </div>
    </header>

    <section id="hero" class="hero" aria-labelledby="hero-title">
      <div class="hero-inner">
        <div class="hero-copy">
          <p class="hero-eyebrow">{{ t('landing.systemName') }}</p>
          <h1 id="hero-title" class="hero-title">{{ t('landing.systemTitle') }}</h1>
          <p class="hero-org">{{ t('brand.fullName') }}</p>
          <p class="hero-desc">{{ t('landing.heroDesc') }}</p>
          <button type="button" class="signin-btn" @click="goToLogin">
            {{ t('auth.signIn') }}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </section>

    <main>
      <section id="about" class="section about-section" aria-labelledby="about-title">
        <div class="section-inner">
          <p class="section-eyebrow">{{ t('landing.aboutEyebrow') }}</p>
          <h2 id="about-title" class="section-title">{{ t('landing.aboutTitle') }}</h2>
          <p class="section-lead">{{ t('landing.aboutBody') }}</p>
        </div>
      </section>

      <section id="features" class="section features-section" aria-labelledby="features-title">
        <div class="section-inner">
          <p class="section-eyebrow">{{ t('landing.featuresEyebrow') }}</p>
          <h2 id="features-title" class="section-title">{{ t('landing.featuresTitle') }}</h2>
          <p class="section-lead">{{ t('landing.featuresIntro') }}</p>

          <div class="feature-grid">
            <article class="feature-item">
              <div class="feature-icon" aria-hidden="true">
                <BookingIcon :size="22" color="currentColor" />
              </div>
              <h3 class="feature-title">{{ t('landing.feature1Title') }}</h3>
              <p class="feature-desc">{{ t('landing.feature1Desc') }}</p>
            </article>

            <article class="feature-item">
              <div class="feature-icon" aria-hidden="true">
                <CoinsIcon :size="22" color="currentColor" />
              </div>
              <h3 class="feature-title">{{ t('landing.feature2Title') }}</h3>
              <p class="feature-desc">{{ t('landing.feature2Desc') }}</p>
            </article>

            <article class="feature-item">
              <div class="feature-icon" aria-hidden="true">
                <FarmIcon :size="22" color="currentColor" />
              </div>
              <h3 class="feature-title">{{ t('landing.feature3Title') }}</h3>
              <p class="feature-desc">{{ t('landing.feature3Desc') }}</p>
            </article>

            <article class="feature-item">
              <div class="feature-icon" aria-hidden="true">
                <ChartLineIcon :size="22" color="currentColor" />
              </div>
              <h3 class="feature-title">{{ t('landing.feature4Title') }}</h3>
              <p class="feature-desc">{{ t('landing.feature4Desc') }}</p>
            </article>
          </div>
        </div>
      </section>

      <section id="helps" class="section helps-section" aria-labelledby="helps-title">
        <div class="section-inner">
          <p class="section-eyebrow">{{ t('landing.helpsEyebrow') }}</p>
          <h2 id="helps-title" class="section-title">{{ t('landing.helpsTitle') }}</h2>
          <p class="section-lead">{{ t('landing.helpsBody') }}</p>
        </div>
      </section>

      <section class="section cta-section" aria-labelledby="cta-title">
        <div class="section-inner cta-inner">
          <h2 id="cta-title" class="section-title">{{ t('landing.ctaTitle') }}</h2>
          <p class="section-lead cta-lead">{{ t('landing.ctaBody') }}</p>
        </div>
      </section>
    </main>

    <footer class="landing-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <img :src="calffaLogo" alt="" class="footer-logo" />
          <div>
            <p class="footer-name">{{ t('brand.name') }}</p>
            <p class="footer-org">{{ t('brand.fullName') }}</p>
          </div>
        </div>
        <p class="footer-meta">{{ t('landing.footerSystem') }}</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ThemeToggle from '../components/ThemeToggle.vue'
import LanguageToggle from '../components/LanguageToggle.vue'
import BookingIcon from '../components/icons/BookingIcon.vue'
import CoinsIcon from '../components/icons/CoinsIcon.vue'
import FarmIcon from '../components/icons/FarmIcon.vue'
import ChartLineIcon from '../components/icons/ChartLineIcon.vue'
import { useBackdropTheme } from '../composables/useBackdropTheme'
import farmerPhoto from '../assets/landing/farmer-hero.jpg'
import dashboardLight from '../assets/landing/dashboard-light.png'
import dashboardDark from '../assets/landing/dashboard-dark.png'
import calffaLogo from '../assets/landing/calffa-logo.jpg'

const router = useRouter()
const { t } = useI18n()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)
const dashboardSrc = computed(() => (isLight.value ? dashboardLight : dashboardDark))

function scrollTo(id) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function goToLogin() {
  router.push('/login')
}
</script>

<style scoped>
.landing-page {
  --landing-font: 'Plus Jakarta Sans', 'Open Sans', 'Segoe UI', sans-serif;
  --nav-h: 64px;
  --content-pad: clamp(1.15rem, 2.4vw, 2.6rem);
  --content-w: 100%;
  --dash-x: 46%;
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  overflow-x: clip;
  font-family: var(--landing-font);
  color: #ecfdf5;
  background: #0f2a1c;
}

.landing-page.light-theme {
  color: #14532d;
  background: #e8f7ee;
}

.page-backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.bg-dashboard {
  position: absolute;
  left: -6%;
  top: -14%;
  width: 118%;
  height: 128%;
  object-fit: cover;
  object-position: var(--dash-x) 64%;
  filter: blur(1.5px) saturate(0.82) contrast(0.96);
  opacity: 0.38;
}

.landing-page.light-theme .bg-dashboard {
  opacity: 0.28;
  filter: blur(3.5px) saturate(0.75) contrast(0.88) brightness(1.12);
}

.bg-farmer {
  position: absolute;
  right: 0;
  top: 0;
  width: min(66vw, 1120px);
  height: 100%;
  object-fit: cover;
  object-position: 68% 42%;
  opacity: 0.94;
  -webkit-mask-image: linear-gradient(
    90deg,
    transparent 0%,
    rgba(0, 0, 0, 0.18) 12%,
    rgba(0, 0, 0, 0.78) 32%,
    #000 48%
  );
  mask-image: linear-gradient(
    90deg,
    transparent 0%,
    rgba(0, 0, 0, 0.18) 12%,
    rgba(0, 0, 0, 0.78) 32%,
    #000 48%
  );
}

.landing-page.light-theme .bg-farmer {
  opacity: 0.9;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(7, 24, 16, 0.7) 0%,
    rgba(7, 24, 16, 0.4) 30%,
    rgba(7, 24, 16, 0.1) 54%,
    rgba(7, 24, 16, 0.08) 100%
  );
}

.landing-page.light-theme .bg-overlay {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.88) 0%,
    rgba(247, 253, 249, 0.78) 22%,
    rgba(247, 253, 249, 0.42) 40%,
    rgba(255, 255, 255, 0.12) 58%,
    rgba(255, 255, 255, 0.04) 100%
  );
}

.hero,
main,
.landing-footer {
  position: relative;
  z-index: 1;
}

.landing-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  height: var(--nav-h);
  background: rgba(8, 26, 18, 0.58);
  border-bottom: 1px solid rgba(167, 211, 178, 0.16);
  backdrop-filter: blur(16px);
}

.landing-page.light-theme .landing-nav {
  background: rgba(255, 255, 255, 0.86);
  border-bottom: 1px solid rgba(22, 101, 52, 0.14);
}

.nav-inner,
.hero-inner,
.section-inner,
.footer-inner {
  width: var(--content-w);
  margin: 0 auto;
  padding-left: var(--content-pad);
  padding-right: var(--content-pad);
}

.nav-inner {
  height: 100%;
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 1.5rem;
}

.nav-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
  padding: 0 !important;
  border-radius: 0;
  text-decoration: none;
  color: inherit;
  background: none;
  box-shadow: none;
}

.nav-brand:hover,
.nav-brand:focus {
  transform: none;
  box-shadow: none;
  outline-offset: 3px;
}

.nav-logo,
.footer-logo {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid rgba(250, 204, 21, 0.45);
  background: #fff;
}

.landing-page.light-theme .nav-logo,
.landing-page.light-theme .footer-logo {
  border-color: rgba(22, 101, 52, 0.22);
}

.nav-brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  min-width: 0;
}

.nav-brand-name {
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #f8fff9 !important;
}

.nav-brand-tagline {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #b8dcc6 !important;
}

.landing-page.light-theme .nav-brand-name {
  color: #14532d !important;
}

.landing-page.light-theme .nav-brand-tagline {
  color: #3f6b4e !important;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 1.6rem;
  margin-left: auto;
}

.nav-controls {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  height: 38px;
}

.nav-controls :deep(.theme-toggle-floating),
.nav-controls :deep(.lang-toggle--floating) {
  --control-h: 38px;
  box-sizing: border-box !important;
  height: 38px !important;
  min-height: 38px !important;
  max-height: 38px !important;
  margin: 0 !important;
}

.nav-controls :deep(.theme-toggle-floating) {
  width: 38px !important;
  min-width: 38px !important;
  padding: 0 !important;
  flex: 0 0 38px;
}

.nav-controls :deep(.lang-toggle--floating) {
  display: inline-flex !important;
  align-items: stretch !important;
  flex: 0 0 auto;
}

.nav-controls :deep(.lang-btn) {
  height: 100% !important;
  min-height: 0 !important;
  min-width: 0 !important;
  padding: 0 0.75rem !important;
}

.nav-text-link {
  padding: 0.2rem 0;
  border: none;
  border-radius: 0;
  background: none;
  box-shadow: none;
  min-height: 0;
  min-width: 0;
  font-family: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  color: #d1e7d8 !important;
  text-decoration: none;
}

.nav-text-link:hover,
.nav-text-link:focus {
  color: #ffffff !important;
  transform: none;
  box-shadow: none;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.landing-page.light-theme .nav-text-link {
  color: #166534 !important;
}

.landing-page.light-theme .nav-text-link:hover,
.landing-page.light-theme .nav-text-link:focus {
  color: #14532d !important;
}

.hero {
  scroll-margin-top: 0;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  padding-top: var(--nav-h);
}

.hero-inner {
  padding-top: 4rem;
  padding-bottom: 4.5rem;
}

.hero-copy {
  max-width: 42rem;
}

.landing-page.light-theme .hero-copy {
  padding: 1.35rem 1.4rem 1.5rem;
  margin-left: -0.4rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(22, 101, 52, 0.1);
  box-shadow: 0 10px 28px rgba(22, 101, 52, 0.08);
  backdrop-filter: blur(14px);
}

.landing-page:not(.light-theme) .hero-title,
.landing-page:not(.light-theme) .hero-desc,
.landing-page:not(.light-theme) .hero-org {
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.32);
}

.landing-page.light-theme .hero-title,
.landing-page.light-theme .hero-desc,
.landing-page.light-theme .hero-org,
.landing-page.light-theme .hero-eyebrow {
  text-shadow: none;
}

.hero-eyebrow {
  margin: 0 0 0.55rem;
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #86efac !important;
}

.landing-page.light-theme .hero-eyebrow {
  color: #15803d !important;
}

.hero-title {
  margin: 0 0 0.7rem;
  font-size: clamp(2rem, 4.4vw, 3.35rem);
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -0.03em;
  color: #f8fff9 !important;
}

.landing-page.light-theme .hero-title {
  color: #14532d !important;
}

.hero-org {
  margin: 0 0 1.05rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #bbf7d0 !important;
}

.landing-page.light-theme .hero-org {
  color: #166534 !important;
}

.hero-desc {
  margin: 0 0 1.7rem;
  max-width: 40rem;
  font-size: 1.05rem;
  line-height: 1.7;
  color: #d1e7d8 !important;
}

.landing-page.light-theme .hero-desc {
  color: #3f6b4e !important;
}

.signin-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 48px;
  min-width: 148px;
  padding: 0.78rem 1.35rem;
  border: none !important;
  border-radius: 12px;
  background: #16a34a !important;
  color: #ffffff !important;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(4, 18, 12, 0.32) !important;
}

.signin-btn:hover {
  background: #22c55e !important;
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(4, 18, 12, 0.36) !important;
}

.signin-btn:active {
  transform: translateY(0);
}

.signin-btn:focus-visible {
  outline: 3px solid rgba(74, 222, 128, 0.7);
  outline-offset: 3px;
}

.landing-page.light-theme .signin-btn {
  background: #14532d !important;
  box-shadow: 0 8px 20px rgba(20, 83, 45, 0.22) !important;
}

.landing-page.light-theme .signin-btn:hover {
  background: #166534 !important;
}

.section {
  scroll-margin-top: calc(var(--nav-h) + 12px);
  padding: 4.2rem 0;
}

.about-section,
.helps-section {
  background: rgba(10, 32, 22, 0.48);
}

.landing-page.light-theme .about-section,
.landing-page.light-theme .helps-section {
  background: rgba(255, 255, 255, 0.42);
}

.features-section,
.cta-section {
  background: rgba(8, 26, 18, 0.54);
}

.landing-page.light-theme .features-section,
.landing-page.light-theme .cta-section {
  background: rgba(255, 255, 255, 0.36);
}

.section-eyebrow {
  margin: 0 0 0.55rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #86efac !important;
}

.landing-page.light-theme .section-eyebrow {
  color: #15803d !important;
}

.section-title {
  margin: 0 0 0.85rem;
  font-size: clamp(1.5rem, 2.6vw, 2.05rem);
  font-weight: 800;
  letter-spacing: -0.025em;
  color: #f8fff9 !important;
}

.landing-page.light-theme .section-title {
  color: #14532d !important;
}

.section-lead {
  margin: 0;
  max-width: 54rem;
  font-size: 1.04rem;
  line-height: 1.7;
  color: #b8dcc6 !important;
}

.landing-page.light-theme .section-lead {
  color: #3f6b4e !important;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 3.25rem;
  row-gap: 1.75rem;
  margin-top: 2rem;
}

.feature-item {
  padding: 0 0 1.35rem;
  border: none;
  border-bottom: 1px solid rgba(167, 211, 178, 0.18);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.landing-page.light-theme .feature-item {
  background: transparent;
  border-bottom-color: rgba(22, 101, 52, 0.16);
  box-shadow: none;
}

.feature-icon {
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.7rem;
  border-radius: 8px;
  color: #86efac;
  background: rgba(22, 101, 52, 0.32);
}

.landing-page.light-theme .feature-icon {
  color: #166534;
  background: rgba(220, 252, 231, 0.9);
}

.feature-title {
  margin: 0 0 0.55rem;
  font-size: 1.08rem;
  font-weight: 700;
  line-height: 1.35;
  color: #f8fff9 !important;
}

.landing-page.light-theme .feature-title {
  color: #14532d !important;
}

.feature-desc {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.65;
  color: #b8dcc6 !important;
}

.landing-page.light-theme .feature-desc {
  color: #3f6b4e !important;
}

.cta-inner {
  text-align: center;
}

.cta-inner .section-title,
.cta-lead {
  margin-left: auto;
  margin-right: auto;
}

.cta-lead {
  max-width: 42rem;
}

.landing-footer {
  border-top: 1px solid rgba(167, 211, 178, 0.16);
  background: rgba(6, 18, 12, 0.62);
  padding: 1.35rem 0;
}

.landing-page.light-theme .landing-footer {
  background: rgba(255, 255, 255, 0.5);
  border-top-color: rgba(22, 101, 52, 0.14);
}

.footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.footer-logo {
  width: 36px;
  height: 36px;
}

.footer-name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  color: #f8fff9 !important;
}

.footer-org,
.footer-meta {
  margin: 0;
  font-size: 0.82rem;
  color: #b8dcc6 !important;
}

.landing-page.light-theme .footer-name {
  color: #14532d !important;
}

.landing-page.light-theme .footer-org,
.landing-page.light-theme .footer-meta {
  color: #3f6b4e !important;
}

@media (max-width: 980px) {
  .landing-page {
    --nav-h: 58px;
    --dash-x: 88%;
    --content-pad: 1.15rem;
  }

  .nav-inner {
    gap: 0.55rem;
    flex-wrap: nowrap;
  }

  .nav-brand {
    min-width: 0;
    overflow: hidden;
  }

  .nav-brand-tagline {
    display: none;
  }

  .nav-links {
    display: none;
  }

  .nav-controls {
    margin-left: auto;
  }

  .hero-inner {
    padding-top: 1.6rem;
    padding-bottom: 42vh;
  }

  .hero-copy {
    max-width: 36rem;
  }

  .bg-dashboard {
    left: 0;
    width: 100%;
    object-position: 88% 60%;
  }

  .bg-farmer {
    width: 100%;
    height: 52%;
    top: auto;
    bottom: 0;
    right: 0;
    opacity: 0.92;
    -webkit-mask-image: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.55) 22%, #000 42%);
    mask-image: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.55) 22%, #000 42%);
  }

  .bg-overlay {
    background: linear-gradient(
      180deg,
      rgba(7, 24, 16, 0.82) 0%,
      rgba(7, 24, 16, 0.58) 34%,
      rgba(7, 24, 16, 0.18) 62%,
      rgba(7, 24, 16, 0.28) 100%
    );
  }

  .landing-page.light-theme .bg-overlay {
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.88) 0%,
      rgba(247, 253, 249, 0.72) 28%,
      rgba(255, 255, 255, 0.18) 58%,
      rgba(255, 255, 255, 0.1) 100%
    );
  }
}

@media (max-width: 720px) {
  .feature-grid {
    grid-template-columns: 1fr;
  }

  .section {
    padding: 3.1rem 0;
  }

  .hero-title {
    font-size: 1.75rem;
  }

  .hero-desc,
  .section-lead,
  .feature-desc {
    font-size: 0.95rem;
  }

  .signin-btn {
    width: 100%;
    max-width: 280px;
  }

  .nav-logo {
    width: 34px;
    height: 34px;
  }

  .nav-brand-name {
    font-size: 0.95rem;
  }

  .footer-inner {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation: none !important;
    transition: none !important;
    scroll-behavior: auto !important;
  }
}
</style>
