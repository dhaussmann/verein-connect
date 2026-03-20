import slugify from 'slugify';

export function generateSlug(name: string): string {
  return slugify(name, { lower: true, locale: 'de', strict: true });
}
