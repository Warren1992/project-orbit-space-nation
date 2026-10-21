# Project Orbit — Digital Space Nation v1

A mobile-first, static prototype for a social + civic digital space nation. It is designed to run directly on GitHub Pages with **no build step** and **no paid hosting**.

## Included in v1

- Social feed with local posting
- Founder / Head of Nation profile
- Citizen registry and search
- Elections / referendum prototype with local vote persistence
- Senate page and bill list
- Constitution draft
- Treasury / in-platform credits prototype
- Government institutions page
- Space Program page
- Events page
- Future Virtual World tab
- Responsive desktop + mobile layouts
- Browser `localStorage` for prototype posts and votes

## Run locally

Open `index.html` directly in a browser, or use a simple local server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Put it on GitHub Pages

1. Create a new GitHub repository.
2. Upload `index.html`, `styles.css`, and `app.js` to the repository root.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select your main branch and `/ (root)`.
6. Save. GitHub will publish the site at your GitHub Pages URL.

## Important prototype limitation

This version is intentionally backend-free. Posts and votes are saved only in the current browser using `localStorage`; they are not shared between users.

For the first real multi-user version, connect a backend such as Supabase for:

- accounts and authentication
- citizen numbers
- posts/comments/follows
- election integrity
- Senate roles
- shared treasury balances
- database-backed space project progress

## Naming

`Project Orbit` is a placeholder brand. Change `APP_NAME` in `app.js` and the branding text in `index.html` when you choose the nation name.

## Suggested next milestone

**v1.1: Supabase-backed accounts and citizen registry.**

That would turn this from a single-browser demo into a real multi-user founding-citizen website.
