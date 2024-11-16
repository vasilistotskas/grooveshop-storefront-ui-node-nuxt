<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })

useSeoMeta({
  title: t('title'),
})
useHydratedHead({
  title: t('title'),
})

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="container flex flex-col">
    <PageTitle
      :text="t('title')"
      class="mb-4 text-center capitalize"
    />
    <PageBody>
      <div class="article container-xs">
        <div class="grid items-center justify-center">
          <NuxtImg
            :style="{ objectFit: 'contain' }"
            src="/img/pages/about-webside.png"
            :width="960"
            :height="600"
            alt="Webside"
            loading="eager"
            format="png"
            quality="100"
            preload
          />
        </div>
        <p
          class="
            text-primary-950

            dark:text-primary-50
          "
        >
          Χρησιμοποιώντας ως γνώμονα το μοντέλο ηλεκτρονικής μάθησης «Microlearning», ολοκληρώθηκε η δημιουργία της
          τελικής μορφής της εφαρμογής “Webside”.
        </p>
        <p
          class="
            text-primary-950

            dark:text-primary-50
          "
        >
          To Webside, είναι μία ηλεκτρονική πλατφόρμα Microlearning και ηλεκτρονικού εμπορίου, όπου μπορείς να
          εκπαιδευτείς και να λάβεις χρήσιμες πληροφορίες σχετικά με την ηλεκτρονική προστασία σου από ηλεκτρονικές
          απειλές και να ενημερωθείς – εκπαιδευτείς δωρεάν σχετικά με βέλτιστες πρακτικές, συμβουλές και tips σχετικά με
          τον κλάδο της τεχνολογίας (PC, Mobile, AI κ.α.).
        </p>
        <p
          class="
            text-primary-950

            dark:text-primary-50
          "
        >
          Ο σκοπός του Webside είναι η οικοδόμηση μίας κουλτούρας τεχνολογικής γνώσης και ηλεκτρονικής ασφάλειας, στα
          πλαίσια της αυξητικής τάσης χρήσης της τεχνολογίας σε καθημερινή βάση.
        </p>
        <p
          class="
            text-primary-950

            dark:text-primary-50
          "
        >
          Για την δημιουργία και παροχή του περιεχομένου σε όλα τα ψηφιακά κανάλια (ιστοσελίδα, social media κ.α.),
          γίνεται η χρήση διάφορων εκπαιδευτικών μεθόδων όπως το Microlearning, με τέτοιο τρόπο ώστε ο κάθε χρήστης να
          μπορεί να αφομοιώσει το συγκεκριμένο περιεχόμενο εύκολα και γρήγορα με μικρές δόσεις πληροφορίας.
        </p>
        <p
          class="
            text-primary-950

            dark:text-primary-50
          "
        >
          Παράλληλα, το Webside περιλαμβάνει και ηλεκτρονικό κατάστημα τεχνολογικών προιόντων, μέσω του οποίου μπορείς
          να
          αγοράσεις χρήσιμα tech gadgets τα οποία κατά κύριο λόγο θα συνδέονται άμεσα με το αντικείμενο των
          εκπαιδευτικών
          ενοτήτων (PC, Mobile, AI κ.α.).
        </p>
      </div>
    </PageBody>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Τι Είναι Το Webside
</i18n>
