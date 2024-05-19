<script lang="ts" setup>
definePageMeta({
  layout: 'default',
})
</script>

<template>
  <PageWrapper class="container flex flex-col">
    <PageTitle
      :text="$t('pages.contact.title')"
      class="mb-4 text-center capitalize"
    />
    <PageBody>
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
    </PageBody>
  </PageWrapper>
</template>
