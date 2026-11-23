import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const toursCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/tours" }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    city: z.string(),
    venue: z.string().optional(),
    // Who runs the night, the ticket page and the entry price in CZK: only what the promoter really published; no page means tickets at the door
    organizer: z.string().optional(),
    tickets: z.string().url().optional(),
    price: z.number().nonnegative().optional(),
  }),
});

const audioCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/audio" }),
  schema: z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    description: z.string(),
    url: z.string().url(),
  }),
});

export const collections = {
  'tours': toursCollection,
  'audio': audioCollection,
};
