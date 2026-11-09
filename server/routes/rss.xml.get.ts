import { defineEventHandler } from 'h3'

/** The store's feed: its blog posts and, with the catalogue, its products (`server/utils/rssFeed.ts`). */
export default defineEventHandler(event => respondWithRssFeed(event, 'store'))
