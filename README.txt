PATH TO VENUS — VENUS JOURNAL / BLOG UPDATE
============================================

WHAT IS INCLUDED
  index.html          Updated homepage with Blog navigation and teaser
  styles.css          Existing styles plus Blog and article styles
  store.html          Existing shop with Blog navigation
  contact.html        Existing working form with Blog navigation
  thank-you.html      Existing thank-you page + Blog navigation (noindex)
  blog/index.html     Fully responsive journal with category filters and search
  blog/*.html         SIX original long-form science explainers
  blog/feed.xml       RSS feed for subscribers
  sitemap.xml         Complete sitemap (including the six articles)
  robots.txt          Points search engines to sitemap.xml
  BLOG_GUIDE.md       How to publish and maintain new articles

PUBLISHING — GITHUB PAGES
1. Open https://github.com/Warren1992/path-to-venus (main branch).
2. On desktop: upload the contents of this ZIP into the repository ROOT.
   IMPORTANT: Keep the blog/ folder and its files together. Do not upload the
   ZIP itself or put all the blog files at the root.
3. Overwrite the existing 5 HTML/CSS files, keeping public/, src/ and
   nimbivale.html unchanged. Add the new blog/ directory, sitemap.xml,
   robots.txt and BLOG_GUIDE.md. Commit changes to main.
4. After the Pages deployment finishes, check:
     https://pathtovenus.com/blog/
     https://pathtovenus.com/blog/could-humans-live-in-venus-clouds.html
     https://pathtovenus.com/sitemap.xml
     https://pathtovenus.com/store.html
     https://pathtovenus.com/contact.html
5. In Google Search Console, verify the site and submit sitemap.xml.
   Google indexing and search traffic are NOT guaranteed.

ARTICLE DESIGN
- No frameworks, plugins, databases or server needed for the blog.
- Existing images in public/assets are used, clearly described as concept art.
- Each article has unique meta title, description, canonical, Open Graph tags,
  BlogPosting structured data, a publication date, source links and more reading.
- Category buttons and keyword search work in the browser; all article links
  remain visible even if JavaScript is off.
- No payment or contact processing changes: Store stays at Printify; the
  Contact form still requires FormSubmit email verification to receive messages.

IMPORTANT
Because this is a static GitHub Pages website, you still publish new
articles by adding/editing website files and committing them. See BLOG_GUIDE.md.
