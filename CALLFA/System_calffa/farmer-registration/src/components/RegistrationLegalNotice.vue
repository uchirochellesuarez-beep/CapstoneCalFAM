<template>
  <aside class="registration-legal" aria-label="Terms and data privacy notice">
    <button
      type="button"
      class="registration-legal-toggle"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <span class="registration-legal-toggle-title">{{ copy.title }}</span>
      <span class="registration-legal-toggle-action">
        {{ expanded ? copy.hideDetails : copy.showDetails }}
      </span>
    </button>

    <p v-if="!expanded" class="registration-legal-summary">{{ copy.summary }}</p>

    <div v-show="expanded" class="registration-legal-body">
      <section class="registration-legal-section">
        <h4>{{ copy.termsHeading }}</h4>
        <ul>
          <li v-for="(item, index) in copy.terms" :key="'t-' + index">{{ item }}</li>
        </ul>
      </section>

      <section class="registration-legal-section">
        <h4>{{ copy.privacyHeading }}</h4>
        <p class="registration-legal-lead">{{ copy.privacyLead }}</p>
        <ul>
          <li v-for="(item, index) in copy.privacy" :key="'p-' + index">{{ item }}</li>
        </ul>
      </section>
    </div>

    <label class="registration-legal-agree">
      <input v-model="agreed" type="checkbox" class="registration-legal-checkbox" />
      <span>{{ copy.agreeLabel }}</span>
    </label>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'

const agreed = defineModel('agreed', { type: Boolean, default: false })

const props = defineProps({
  language: {
    type: String,
    default: 'en'
  }
})

const expanded = ref(false)

const content = {
  en: {
    title: 'Terms & Data Privacy',
    showDetails: 'Show details',
    hideDetails: 'Hide details',
    summary: 'Tap "Show details" to read membership terms and RA 10173 data privacy before you register.',
    termsHeading: 'Membership Terms',
    terms: [
      'By registering, you apply for CALFFA (Calapan Federation of Farmers Association) cooperative membership.',
      'Your account starts as Pending until your Barangay President reviews and approves your application.',
      'You must provide accurate personal, contact, and farm information. False or misleading details may lead to rejection or removal.',
      'Approved members may use CALFFA services (machinery booking, loans, share capital, announcements, and related programs) according to cooperative policies.',
      'CALFFA officers may update membership status, roles, and access based on barangay records and federation rules.'
    ],
    privacyHeading: 'Data Privacy (RA 10173)',
    privacyLead: 'CALFFA collects and processes your data only for legitimate cooperative purposes:',
    privacy: [
      'Data collected: full name, reference number, birth date, address, phone number, educational status, barangay, farm area/location, account credentials, and (for Google sign-up) email and profile photo.',
      'Purpose: member registration, identity verification, barangay assignment, approval workflow, service delivery, and compliance with cooperative records.',
      'Access: authorized CALFFA administrators and barangay officers (e.g., President, Treasurer) for your assigned barangay; shared only when required by law or with your consent.',
      'Security: passwords are stored using secure hashing; access is limited to authorized system users.',
      'Rights: you may request correction of your records through your barangay officer or CALFFA administration, subject to verification.',
      'Retention: records are kept while membership is active and as required by cooperative and applicable legal requirements.'
    ],
    agreeLabel: 'I agree to the terms and conditions and data privacy policy, and consent to CALFFA processing my personal data as described above.'
  },
  tl: {
    title: 'Mga Tuntunin at Privacy ng Data',
    showDetails: 'Ipakita ang detalye',
    hideDetails: 'Itago ang detalye',
    summary: 'Pindutin ang "Ipakita ang detalye" upang basahin ang mga tuntunin at RA 10173 data privacy bago magrehistro.',
    termsHeading: 'Mga Tuntunin sa Membership',
    terms: [
      'Sa pagrehistro, nag-aaplay kayo bilang miyembro ng kooperatiba ng CALFFA (Calapan Federation of Farmers Association).',
      'Ang inyong account ay magsisimula bilang Pending hanggang suriin at aprubahan ito ng inyong Barangay President.',
      'Dapat tama at tapat ang personal, contact, at impormasyon ng sakahan. Maaaring tanggihan o alisin ang maling impormasyon.',
      'Ang mga aprubadong miyembro ay maaaring gumamit ng serbisyo ng CALFFA (machinery booking, loans, share capital, anunsyo, at iba pa) ayon sa patakaran ng kooperatiba.',
      'Maaaring baguhin ng mga opisyal ng CALFFA ang membership status, role, at access batay sa talaan ng barangay at alituntunin ng federasyon.'
    ],
    privacyHeading: 'Privacy ng Data (RA 10173)',
    privacyLead: 'Kinokolekta at pinoproseso ng CALFFA ang inyong data para lamang sa lehitimong layunin ng kooperatiba:',
    privacy: [
      'Kinokolektang data: buong pangalan, reference number, petsa ng kapanganakan, address, numero ng telepono, edukasyon, barangay, lawak/lokasyon ng sakahan, account credentials, at (sa Google sign-up) email at larawan ng profile.',
      'Layunin: pagrehistro ng miyembro, pag-verify ng pagkakakilanlan, pagtatalaga ng barangay, approval workflow, pagbibigay ng serbisyo, at compliance sa talaan ng kooperatiba.',
      'Access: awtorisadong admin ng CALFFA at mga opisyal ng barangay (hal. President, Treasurer) para sa inyong barangay; ibinabahagi lamang kung kinakailangan ng batas o may pahintulot.',
      'Seguridad: ang mga password ay naka-hash; limitado ang access sa awtorisadong gumagamit ng sistema.',
      'Karapatan: maaari kayong humiling ng pagwawasto ng talaan sa inyong barangay officer o administrasyon ng CALFFA, subject sa verification.',
      'Retention: pinapanatili ang talaan habang aktibo ang membership at ayon sa kinakailangan ng kooperatiba at batas.'
    ],
    agreeLabel: 'Sumasang-ayon ako sa mga tuntunin at data privacy policy, at pumapayag sa pagproseso ng aking personal na data ng CALFFA gaya ng inilarawan sa itaas.'
  }
}

const copy = computed(() => content[props.language === 'tl' ? 'tl' : 'en'])
</script>

<style scoped>
.registration-legal {
  grid-column: 1 / -1;
  margin-top: 0.1rem;
  padding: 0.38rem 0.48rem;
  border-radius: 10px;
  border: 1px solid rgba(134, 239, 172, 0.28);
  background: linear-gradient(
    145deg,
    rgba(12, 38, 22, 0.42) 0%,
    rgba(18, 52, 32, 0.34) 100%
  );
  color: rgba(236, 253, 245, 0.92);
  font-size: 0.62rem;
  line-height: 1.35;
}

.registration-legal-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
}

.registration-legal-toggle-title {
  font-size: 0.7rem;
  font-weight: 700;
  color: #ffd966;
  letter-spacing: 0.02em;
}

.registration-legal-toggle-action {
  flex-shrink: 0;
  font-size: 0.6rem;
  font-weight: 700;
  color: rgba(134, 239, 172, 0.95);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.registration-legal-summary {
  margin: 0.22rem 0 0;
  color: rgba(211, 218, 206, 0.88);
  font-size: 0.6rem;
  line-height: 1.3;
}

.registration-legal-body {
  margin-top: 0.28rem;
  padding-top: 0.22rem;
  border-top: 1px solid rgba(134, 239, 172, 0.22);
  max-height: 9.5rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.registration-legal-section {
  margin-bottom: 0.28rem;
}

.registration-legal-section h4 {
  margin: 0 0 0.12rem;
  font-size: 0.64rem;
  font-weight: 700;
  color: rgba(220, 255, 235, 0.96);
}

.registration-legal-lead {
  margin: 0 0 0.12rem;
}

.registration-legal ul {
  margin: 0;
  padding-left: 1rem;
}

.registration-legal li {
  margin-bottom: 0.1rem;
}

.registration-legal-agree {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  margin-top: 0.32rem;
  padding-top: 0.28rem;
  border-top: 1px solid rgba(134, 239, 172, 0.22);
  cursor: pointer;
  font-size: 0.62rem;
  font-weight: 600;
  line-height: 1.35;
  color: rgba(220, 255, 235, 0.96);
}

.registration-legal-checkbox {
  width: 0.85rem;
  height: 0.85rem;
  margin-top: 0.08rem;
  flex-shrink: 0;
  accent-color: #6bbf59;
  cursor: pointer;
}
</style>
