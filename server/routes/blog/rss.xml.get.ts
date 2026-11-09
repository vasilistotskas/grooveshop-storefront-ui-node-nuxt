import { defineEventHandler } from 'h3'

/** The store's blog feed: its posts alone, never a product (`server/utils/rssFeed.ts`). */
export default defineEventHandler(event => respondWithRssFeed(event, 'blog'))
