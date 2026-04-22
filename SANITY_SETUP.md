# Sanity CMS setup for YUEYAN BOUTIQUE

This site can read products from Sanity CMS. Until Sanity is connected, it falls back to `products.js`.

## 1. Create a Sanity project

1. Go to https://www.sanity.io/
2. Create a new project.
3. Choose dataset name `production`.
4. Create a Studio.

## 2. Add the product schema

Copy `sanity-product-schema.js` into your Sanity Studio schema folder and include it in the Studio schema index.

## 3. Add products in Sanity Studio

For each product, fill:

- Product name
- Slug
- Brand
- Category
- Price
- Main product image
- Description
- How to use
- Product details
- Published = true

## 4. Allow your website domain if needed

If the browser blocks Sanity requests, add your site origin in Sanity:

1. Go to https://www.sanity.io/manage
2. Open your project
3. Settings -> API settings -> CORS Origins
4. Add your GitHub Pages domain, for example:
   `https://tiffany-tangtang.github.io`
5. Add your final domain later when it is connected.

## 5. Enable Sanity on the website

Open `sanity-config.js` and replace:

```js
enabled: false,
projectId: "YOUR_SANITY_PROJECT_ID",
```

with:

```js
enabled: true,
projectId: "your-real-project-id",
```

Upload these files to GitHub:

- `sanity-config.js`
- `store.js`
- all HTML files

After GitHub Pages rebuilds, products will load from Sanity. If Sanity is unavailable, the site will keep using `products.js`.
