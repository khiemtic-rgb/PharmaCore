import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const tinTuc = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tin-tuc' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    lang: z.literal('vi').default('vi'),
    /** Đường dẫn ảnh hiển thị (CMS), vd. /images/tin-tuc/ten-bai.png */
    image: z.string().optional(),
  }),
});

export const collections = { tinTuc };
