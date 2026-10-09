<script lang="ts" setup>
/**
 * The assistant's conversation: header, messages, quick questions and
 * the prompt. The panel (`Chrome/Assistant.vue`) frames it on a wide
 * screen and the drawer on a phone. The messages are plain text and
 * Markdown with the tool activity above them; the products the gateway
 * surfaced render as cards where they arrived in the reply
 * (`Chrome/AssistantProducts.vue`).
 */
withDefaults(defineProps<{ autofocusPrompt?: boolean }>(), {
  autofocusPrompt: false,
})

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const localePath = useLocalePath()

const { messages, status, errorMessage, cartMutated, send, stop, reset }
  = useShopChat()

const input = ref('')

// The suggestion labels double as the prompts they send — what the
// shopper reads is exactly what the assistant receives.
const suggestions = computed(() => [
  { icon: 'i-lucide-package-search', label: t('suggestions.track') },
  { icon: 'i-lucide-gift', label: t('suggestions.gift') },
  { icon: 'i-lucide-truck', label: t('suggestions.shipping') },
])

// The last assistant bubble is empty while the model thinks — until the
// first tool event or text delta arrives there is nothing to render, so
// that phase is presented as `submitted` and UChatMessages shows its
// indicator (the empty message is filtered out below).
const isThinking = computed(() => {
  if (status.value !== 'streaming') return false
  const last = messages.value[messages.value.length - 1]
  return last?.role === 'assistant' && last.text === ''
    && !(last.tools && last.tools.length > 0)
})

// UChatMessages consumes the Vercel-AI UIMessage shape ({id, role,
// parts}); our transport-agnostic ShopChatMessage maps onto text parts.
// What a UIMessage cannot carry (tool activity, the text and product lists
// in the order they happened) is looked up by id in the #content slot — a
// message with only tool chips or cards (text still streaming) is worth
// showing.
const shownMessages = computed(() =>
  messages.value
    .filter(m => m.text !== '' || (m.tools && m.tools.length > 0) || (m.products && m.products.length > 0))
    .map(m => ({
      ...m,
      segments: chatSegments(m.text, m.products),
    })),
)

const uiMessages = computed(() =>
  shownMessages.value.map(m => ({
    id: m.id,
    role: m.role,
    parts: [{ type: 'text' as const, text: m.text }],
  })),
)

const shownMessage = (id: string) => shownMessages.value.find(m => m.id === id)

const streamingMessageId = computed(() => {
  if (status.value !== 'streaming') return ''
  const last = messages.value[messages.value.length - 1]
  return last?.role === 'assistant' ? last.id : ''
})

// Shopper-readable labels for the gateway's tool activity events;
// anything unmapped falls back to the generic entry.
const TOOL_META: Record<string, { icon: string, key: string }> = {
  search_products: { icon: 'i-lucide-search', key: 'searchProducts' },
  get_product: { icon: 'i-lucide-package', key: 'getProduct' },
  list_categories: { icon: 'i-lucide-layout-grid', key: 'listCategories' },
  get_trending_searches: { icon: 'i-lucide-flame', key: 'trending' },
  get_product_reviews: { icon: 'i-lucide-star', key: 'reviews' },
  get_shipping_options: { icon: 'i-lucide-truck', key: 'shipping' },
  find_pickup_points: { icon: 'i-lucide-map-pin', key: 'pickupPoints' },
  get_payment_methods: { icon: 'i-lucide-credit-card', key: 'payment' },
  create_cart: { icon: 'i-lucide-shopping-cart', key: 'cart' },
  get_cart: { icon: 'i-lucide-shopping-cart', key: 'cart' },
  add_to_cart: { icon: 'i-lucide-shopping-cart', key: 'cart' },
  update_cart_item: { icon: 'i-lucide-shopping-cart', key: 'cart' },
  remove_cart_item: { icon: 'i-lucide-shopping-cart', key: 'cart' },
  get_checkout_link: { icon: 'i-lucide-external-link', key: 'checkoutLink' },
  track_order: { icon: 'i-lucide-package-search', key: 'trackOrder' },
  subscribe_product_alert: { icon: 'i-lucide-bell', key: 'alert' },
  create_checkout: { icon: 'i-lucide-shopping-bag', key: 'checkout' },
  update_checkout: { icon: 'i-lucide-shopping-bag', key: 'checkout' },
  complete_checkout: { icon: 'i-lucide-shopping-bag', key: 'checkout' },
}

function toolMeta(name: string) {
  return TOOL_META[name] ?? { icon: 'i-lucide-cog', key: 'generic' }
}

const uiStatus = computed(() => {
  if (status.value === 'streaming') {
    return isThinking.value ? 'submitted' : 'streaming'
  }
  return status.value
})

function onSubmit() {
  const text = input.value.trim()
  if (!text || status.value === 'streaming') return
  input.value = ''
  send(text)
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden bg-default">
    <div class="flex shrink-0 items-center gap-3 border-b border-default px-4 py-3.5">
      <span class="grid size-10 shrink-0 place-items-center rounded-[0.75rem] bg-inverted">
        <UIcon
          name="i-lucide-zap"
          class="size-5 text-(--ui-volt-on-inverted)"
        />
      </span>
      <div class="min-w-0 flex-1">
        <p class="truncate text-[0.9375rem] font-bold text-highlighted">
          {{ t('title') }}
        </p>
        <p class="truncate text-xs text-muted">
          {{ t('subtitle') }}
        </p>
      </div>
      <UButton
        v-if="messages.length > 0 && status !== 'streaming'"
        icon="i-lucide-rotate-ccw"
        color="neutral"
        variant="ghost"
        size="sm"
        :aria-label="t('new')"
        @click="reset"
      />
      <UButton
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="sm"
        :aria-label="t('close')"
        @click="emit('close')"
      />
    </div>

    <UChatPalette class="min-h-0 flex-1">
      <div
        v-if="uiMessages.length === 0 && uiStatus === 'ready'"
        class="flex h-full flex-col items-center justify-center gap-2 px-6 text-center"
      >
        <span class="grid size-12 place-items-center rounded-[0.875rem] bg-volt text-on-volt">
          <UIcon
            name="i-lucide-zap"
            class="size-6"
          />
        </span>
        <p class="mt-2 font-display text-lg font-bold text-highlighted">
          {{ t('welcome.title') }}
        </p>
        <p class="text-sm text-muted">
          {{ t('welcome.text') }}
        </p>
      </div>
      <UChatMessages
        v-else
        :messages="uiMessages"
        :status="uiStatus"
        should-auto-scroll
        :user="{
          side: 'right',
          variant: 'soft',
          ui: {
            content: 'rounded-2xl rounded-br-md bg-inverted px-4 py-3 text-inverted',
          },
        }"
        :assistant="{
          side: 'left',
          variant: 'naked',
          ui: {
            content: 'rounded-2xl rounded-bl-md bg-elevated px-4 py-3 text-default',
          },
        }"
      >
        <template #leading="{ role }">
          <span
            v-if="role === 'assistant'"
            class="grid size-8 place-items-center rounded-[0.625rem] bg-volt text-on-volt"
          >
            <UIcon
              name="i-lucide-zap"
              class="size-4"
            />
          </span>
        </template>

        <template #content="{ message }">
          <template v-if="message.role === 'assistant'">
            <UChatTool
              v-for="(tool, index) in shownMessage(message.id)?.tools"
              :key="`${message.id}-tool-${index}`"
              :icon="toolMeta(tool.name).icon"
              :text="t(`tools.${toolMeta(tool.name).key}`)"
              :streaming="tool.status === 'running'"
            />
            <template
              v-for="(segment, index) in shownMessage(message.id)?.segments"
              :key="`${message.id}-segment-${index}`"
            >
              <Markdown
                v-if="segment.type === 'text'"
                :value="segment.text"
                :streaming="message.id === streamingMessageId && index === (shownMessage(message.id)?.segments.length ?? 0) - 1"
                class="*:first:mt-0 *:last:mb-0"
              />
              <ChromeAssistantProducts
                v-else
                :event="segment.event"
                @navigate="emit('close')"
              />
            </template>
          </template>
          <p
            v-else
            class="whitespace-pre-wrap"
          >
            {{ message.parts[0]?.text }}
          </p>
        </template>

        <template #indicator>
          <UChatShimmer
            :text="t('thinking')"
            class="px-2 text-sm"
          />
        </template>
      </UChatMessages>

      <UAlert
        v-if="status === 'error' && errorMessage"
        color="error"
        variant="soft"
        class="mx-3 mb-2 w-auto"
        :description="errorMessage"
        :actions="[
          {
            label: t('new'),
            color: 'neutral',
            variant: 'outline',
            size: 'xs',
            onClick: () => reset(),
          },
        ]"
      />

      <div
        v-if="cartMutated && status === 'ready'"
        class="
          mx-3 mb-2 flex items-center justify-between gap-2 rounded-xl
          bg-(--ui-success-soft) px-3 py-2
        "
      >
        <div class="flex min-w-0 items-center gap-2">
          <UIcon
            name="i-lucide-check"
            class="size-4 shrink-0"
          />
          <p class="truncate text-xs text-default">
            {{ t('cartUpdated') }}
          </p>
        </div>
        <UButton
          :label="t('viewCart')"
          color="neutral"
          variant="outline"
          size="xs"
          :to="localePath('cart')"
          @click="emit('close')"
        />
      </div>

      <template #prompt>
        <div
          v-if="status !== 'streaming'"
          class="flex flex-wrap gap-2 px-4 pb-3"
        >
          <UButton
            v-for="suggestion in suggestions"
            :key="suggestion.label"
            :label="suggestion.label"
            color="neutral"
            variant="outline"
            size="xs"
            class="rounded-full"
            @click="send(suggestion.label)"
          />
        </div>
        <UChatPrompt
          v-model="input"
          variant="outline"
          class="px-4 pb-3"
          :autofocus="autofocusPrompt"
          :placeholder="t('placeholder')"
          :maxrows="5"
          :maxlength="2000"
          @submit="onSubmit"
        >
          <UChatPromptSubmit
            :status="uiStatus"
            color="secondary"
            @stop="stop"
          />
          <template #footer>
            <p class="w-full text-center text-[0.6875rem] text-muted">
              {{ t('disclaimer') }}
            </p>
          </template>
        </UChatPrompt>
      </template>
    </UChatPalette>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Βοηθός αγορών
  subtitle: AI βοηθός · διαχειρίζεται το καλάθι σου
  close: Κλείσιμο βοηθού
  welcome:
    title: Γεια σου! Είμαι ο βοηθός αγορών.
    text: Ρώτησέ με για προϊόντα, διαθεσιμότητα, μεταφορικά ή την παραγγελία σου — και μπορώ να ετοιμάσω το καλάθι σου.
  suggestions:
    track: Πού είναι η παραγγελία μου;
    gift: Ψάχνω ιδέες για δώρο
    shipping: Πόσο κοστίζουν τα μεταφορικά;
  cartUpdated: Το καλάθι σου ενημερώθηκε.
  viewCart: Δες το καλάθι
  thinking: Σκέφτομαι…
  tools:
    searchProducts: Αναζήτηση προϊόντων
    getProduct: Άνοιγμα προϊόντος
    listCategories: Κατηγορίες καταστήματος
    trending: Δημοφιλείς αναζητήσεις
    reviews: Κριτικές προϊόντος
    shipping: Έλεγχος μεταφορικών
    pickupPoints: Αναζήτηση σημείων παραλαβής
    payment: Τρόποι πληρωμής
    cart: Ενημέρωση καλαθιού
    checkoutLink: Σύνδεσμος ολοκλήρωσης
    trackOrder: Παρακολούθηση παραγγελίας
    alert: Ρύθμιση ειδοποίησης
    checkout: Προετοιμασία παραγγελίας
    generic: Επεξεργασία αιτήματος
  placeholder: Ρώτησέ με για προϊόντα, παράδοση, επιστροφές…
  new: Νέα συνομιλία
  disclaimer: Ο βοηθός μπορεί να κάνει λάθη — έλεγξε το καλάθι και την παραγγελία σου πριν επιβεβαιώσεις.
en:
  title: Shopping assistant
  subtitle: AI assistant · can manage your cart
  close: Close the assistant
  welcome:
    title: Hello! I am the shopping assistant.
    text: Ask me about products, availability, shipping or your order — and I can put your cart together.
  suggestions:
    track: Where is my order?
    gift: I am looking for gift ideas
    shipping: How much is shipping?
  cartUpdated: Your cart was updated.
  viewCart: View the cart
  thinking: Thinking…
  tools:
    searchProducts: Searching products
    getProduct: Opening the product
    listCategories: Store categories
    trending: Trending searches
    reviews: Product reviews
    shipping: Checking shipping
    pickupPoints: Finding collection points
    payment: Payment methods
    cart: Updating the cart
    checkoutLink: Checkout link
    trackOrder: Tracking the order
    alert: Setting an alert
    checkout: Preparing the order
    generic: Processing the request
  placeholder: Ask about products, delivery, returns…
  new: New conversation
  disclaimer: The assistant can make mistakes — check your cart and order before you confirm.
</i18n>
