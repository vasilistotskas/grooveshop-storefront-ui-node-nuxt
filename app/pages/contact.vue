<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })
const localePath = useLocalePath()

const links = computed(() => [
  {
    to: localePath('index'),
    label: t('breadcrumb.items.index.label'),
    icon: t('breadcrumb.items.index.icon'),
  },
  {
    to: localePath('contact'),
    label: t('breadcrumb.items.contact.label'),
    icon: t('breadcrumb.items.contact.icon'),
    current: true,
  },
])

useSeoMeta({
  title: t('title'),
})
useHead({
  title: t('title'),
})

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="container flex flex-col">
    <UBreadcrumb
      :links="links"
      :ui="{
        li: 'text-primary-950 dark:text-primary-50',
        base: 'text-xs md:text-md',
      }"
      class="container-xs relative min-w-0 mb-5"
    />
    <PageTitle
      :text="t('title')"
      class="mb-4 text-center capitalize"
    />
    <PageBody>
      <div class="grid gap-4 md:gap-6">
        <div class="article container-xs">
          <p
            class="
            text-primary-950

            dark:text-primary-50
          "
          >
            Για κάθε είδους πληροφορίες, διευκρινίσεις, υποβολή οποιουδήποτε αιτήματος : για αλλαγή στοιχείων ή
            διακοπής/περιορισμού της πρόσβασης / χρήσης, ο χρήστης μπορεί να επισκεφτεί την ηλεκτρονική ιστοσελίδα
            <a
              href="https://www.webside.gr"
              class="
              text-primary-800

              dark:text-primary-100
            "
            >webside.gr</a> και να κάνει login στον λογαριασμό του (εφόσον κατέχει/έχει εγγραφεί) επιλέγοντας τις
            κατάλληλες
            επιλογές, ή να επικοινωνήσει μέσω email στη διεύθυνση
            <a
              href="mailto:info@webside.gr"
              class="
              text-primary-800

              dark:text-primary-100
            "
            >
              info@webside.gr
            </a>
          </p>
        </div>
        <ContactForm />
      </div>
    </PageBody>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Επικοινωνία
  breadcrumb:
    items:
      contact:
        label: Επικοινωνία
        icon: i-heroicons-chat-bubble-bottom-center-text
</i18n>
