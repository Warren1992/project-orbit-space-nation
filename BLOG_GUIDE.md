# Publishing new Venus Journal articles

The Journal is built as static HTML for GitHub Pages. No database or paid blog service is required.

## To add a new article

1. Duplicate an article file inside `blog/`, rename it to a descriptive lowercase hyphenated URL, for example `blog/what-is-venus-made-of.html`.
2. Rewrite its `<title>`, meta description, canonical URL, Open Graph tags, JSON-LD `BlogPosting` values, heading, publication date, article text, illustration attribution and science source links.
3. Add an article card/link to `blog/index.html` under `#journal-results`. Give it an appropriate `data-category` and search text so the filters work. Existing filter categories are Venus Science, Missions & Technology, Future Habitats, and Space & Comparison.
4. Add the article's full URL as a new `<url><loc>...</loc></url>` entry in `sitemap.xml`. Add the new article to `blog/feed.xml` (RSS).
5. Commit all changed files in GitHub and open the new article on your domain to check it works. In Google Search Console, you can request indexing.

## Editorial guidelines

- Publish original, fact-checked reporting and explanations. Cite official mission pages, papers or primary data whenever possible.
- Label speculation and concept art explicitly. Don't claim conceptual Venus settlements already exist.
- Update dates when you materially revise articles, including the structured data `dateModified` value.
- Use unique, descriptive titles, helpful headings, accessible alt text and internal links.
- Add your original illustrations to `public/assets/` before referencing them in an article.
- Keep the blog index, sitemap and feed updated as the site grows; doing so helps discovery but does not guarantee Google rankings.
- For actual news articles, include the original event date and verify the facts from primary sources. Don't call timeless explainers 'breaking news'.
- Read the Google Search Essentials documentation: https://developers.google.com/search/docs/essentials

## Site links

- Journal: https://pathtovenus.com/blog/
- Sitemap: https://pathtovenus.com/sitemap.xml
- Feed: https://pathtovenus.com/blog/feed.xml
