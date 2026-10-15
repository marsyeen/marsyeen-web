import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/blog' }),
  schema: () => z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    hidden: z.boolean().default(false),
  }),
});

// One folder per adventure: src/content/adventures/<slug>/index.md, with its photos next to it.
// Image paths in the frontmatter are relative to index.md (e.g. "./cover.jpg").
const adventures = defineCollection({
  loader: glob({
    pattern: '[^_]*/index.md',
    base: './src/content/adventures',
    generateId: ({ entry }) => entry.split('/')[0],
  }),
  schema: ({ image }) => z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    location: z.string().optional(),
    cover: image(),
    photos: z.array(z.object({
      src: image(),
      caption: z.string().optional(),
    })).default([]),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, adventures };
