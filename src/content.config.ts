import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const toursCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/tours" }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    city: z.string(),
    venue: z.string().optional(),
  }),
});

const audioCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/audio" }),
  schema: z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    description: z.string(),
  }),
});

export const collections = {
  'tours': toursCollection,
  'audio': audioCollection,
};
