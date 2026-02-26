# miyata.dev — Personal Portfolio

## Local Development

```bash
npm install
npm run dev
```

Opens at http://localhost:5173

## Build for Production

```bash
npm run build
```

Output goes to `dist/` folder.

## Deploy to Netlify

### Option A: Connect GitHub repo (recommended)

1. Push this project to a GitHub repo (e.g., `miyata-dev`)
2. Go to https://app.netlify.com
3. Click "Add new site" → "Import an existing project"
4. Select your GitHub repo
5. Build settings should auto-detect from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Click "Deploy site"
7. Go to Site settings → Domain management → Add custom domain → `miyata.dev`
8. Update your DNS to point to Netlify (they'll give you the exact records)

### Option B: Manual deploy (quick test)

```bash
npm run build
npx netlify-cli deploy --prod --dir=dist
```

## Custom Domain (miyata.dev)

After deploying, in Netlify dashboard:
1. Site settings → Domain management
2. Add custom domain: `miyata.dev`
3. Update your domain's DNS:
   - If using Netlify DNS: point nameservers to Netlify
   - If using external DNS: add a CNAME record pointing to your Netlify subdomain
4. Netlify will auto-provision an SSL certificate

## Project Structure

```
├── index.html          # Entry point with meta tags / SEO
├── netlify.toml        # Netlify build + redirect config
├── package.json
├── vite.config.js
├── public/
│   └── favicon.svg     # AM monogram favicon
└── src/
    ├── main.jsx        # React mount
    └── Portfolio.jsx   # Full portfolio site component
```

## Customization

All content is in `src/Portfolio.jsx`. Key things to update:

- **About section**: Your narrative and tech stack
- **Case studies**: Add/edit project cards
- **Blog posts**: Update titles, dates, excerpts (and link to full posts when written)
- **Resume**: Add university names, flesh out previous roles
- **Footer links**: Update GitHub, LinkedIn, email URLs
- **Resume PDF**: Add your PDF to `public/` and update the download link href
