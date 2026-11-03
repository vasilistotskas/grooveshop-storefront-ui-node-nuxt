/**
 * Marks a page up as answering the questions in its rich text: the page
 * becomes an FAQPage too and each question a Question node, from the same
 * accordion blocks the reader opens (`faqFromHtml`). Nothing for a text
 * without any.
 *
 * Called once the text is known: `useSchemaOrg` freezes its node array at
 * setup on the server, so the questions cannot arrive later.
 */
export function useFaqSchema(html: string | null | undefined) {
  const questions = faqFromHtml(html)
  if (questions.length === 0) return

  useSchemaOrg([
    defineWebPage({ '@type': ['WebPage', 'FAQPage'] }),
    ...questions.map(({ question, answer }) => defineQuestion({ name: question, acceptedAnswer: answer })),
  ])
}
