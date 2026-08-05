import type { Article } from '@/lib/blog/articles';

/** Resolves new editable SEO fields while preserving all existing article data. */
export function articleSeo(article: Article) {
  return {
    seoTitle: article.seo_title ?? article.seoTitle,
    metaDescription: article.meta_description ?? article.metaDescription,
    slug: article.slug,
    canonicalUrl: article.canonical_url ?? article.canonicalUrl,
    primaryKeyword: article.primary_keyword ?? article.focusKeyword ?? '',
    secondaryKeywords: article.secondary_keywords ?? article.secondaryKeywords ?? [],
    ogImageUrl: article.og_image_url,
    indexStatus: article.index_status ?? 'index',
    publishedAt: article.published_at ?? article.publishedDate,
    updatedAt: article.updated_at ?? article.updatedDate,
  };
}
