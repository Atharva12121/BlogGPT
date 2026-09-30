# BlogGPT

BlogGPT is a team publishing platform for creating, managing, and discovering blog content. It combines a public reading experience with employee authoring tools, administrator controls, engagement features, and optional AI-assisted writing.

## Product Overview

The application has three account roles:

- **Reader**: browse and search published posts, create an account, and like or comment on articles.
- **Employee**: create and manage blog posts, organize content, and review post activity.
- **Administrator**: manage employees and taxonomy, review platform content, and access analytics and exports.

Published articles support categories, tags, view tracking, likes, comments, related posts, PDF export, and an AI reading assistant. Authoring tools include a rich-text editor and optional Gemini-powered generation, editing, SEO, and translation actions.

## Technology

- **Next.js App Router, React, and TypeScript** provide server-rendered pages, API routes, and typed UI components in one application.
- **MongoDB with Prisma ORM** stores users, blogs, categories, tags, and reader activity while providing typed database access.
- **Tailwind CSS and Radix UI** support responsive styling and accessible interface primitives.
- **TipTap** provides the rich-text blog editor and its formatting extensions.
- **Gemini API** powers optional writing and reading assistance; the provider can reject requests when its model is overloaded or the account quota is reached.
- **Cloudinary and a local disk adapter** provide hosted and local image storage options.
- **bcryptjs and signed JWTs** support password hashing and authenticated sessions.

## Requirements

- Node.js 20.9 or newer
- npm (the repository includes `package-lock.json`)
- MongoDB Atlas or a local MongoDB replica set
- Optional: a Google Gemini API key
- Optional: a Cloudinary account for hosted image storage

Prisma's MongoDB connector requires a replica set. For Atlas, use a database user, allow-list the development or deployment host's IP address, and use a connection string that names a database, such as `blog_builder`.

## Quick Start

### 1. Install dependencies

```powershell
npm ci
```

### 2. Create a local environment file

```powershell
Copy-Item .env.example .env.local
```

Fill in the required values described below. Keep `.env.local` private and out of source control. Next.js loads `.env.local` for local development.

### 3. Configure the database

Set `DATABASE_URL` to your MongoDB connection string. For Atlas, use the URI from **Atlas > Connect > Drivers**, include a database name, and URL-encode reserved characters in the database password.

```dotenv
DATABASE_URL="mongodb+srv://<database-user>:<url-encoded-password>@<cluster-host>/blog_builder?retryWrites=true&w=majority"
```

For local development, the URI must point to a MongoDB replica set, for example:

```dotenv
DATABASE_URL="mongodb://localhost:27017/blog_builder?replicaSet=rs0"
```

### 4. Configure authentication

Set a random `JWT_SECRET` with at least 32 characters. You can generate one locally with Node.js:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Set `ADMIN_PROVISIONING_KEY` to a private random value of at least 8 characters. The application enforces that minimum; use 32 or more random characters in practice. The key is used by the restricted `/admin-setup` page and must remain server-side.

### 5. Push the Prisma schema and run the app

```powershell
npm run db:push
npm run dev
```

The development server starts at `http://localhost:3000`. If that port is occupied, use:

```powershell
npm run dev -- --port 3001
```

Open `/admin-setup` to provision the first administrator. Administrators can create employee accounts from the admin dashboard. Readers can register through `/signup`.

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | MongoDB connection string. Include a database name such as `blog_builder`; the database must be reachable from the host running the app. |
| `JWT_SECRET` | Yes | Session signing secret, at least 32 characters. |
| `ADMIN_PROVISIONING_KEY` | For initial admin setup | Private server-side key, at least 8 characters. A longer random value is recommended. |
| `NEXT_PUBLIC_APP_URL` | Recommended | Public site origin used when building article URLs; defaults to `http://localhost:3000`. |
| `GEMINI_API_KEY` | AI features only | Google Gemini API key. Without it, AI endpoints are unavailable. |
| `GEMINI_MODEL` | No | Gemini model name; defaults to `gemini-3.8-flash`. |
| `STORAGE_MODE` | No | `local`, `cloudinary`, or `both`. Defaults to `both`. |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary modes | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | Cloudinary modes | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Cloudinary modes | Cloudinary API secret. |
| `ADMIN_EMAIL` | Optional seed setup | Existing or new administrator email used by the demo seed script. |
| `ADMIN_PASSWORD` | Optional seed setup | Seed administrator password when creating the account; at least 12 characters. |
| `EMPLOYEE_EMAIL` | Optional seed setup | Existing or new employee email used by the demo seed script. |
| `EMPLOYEE_PASSWORD` | Optional seed setup | Seed employee password when creating the account; at least 12 characters. |
| `ALLOW_REMOTE_DEMO_SEED` | No | Set to `true` only when intentionally seeding a non-local database. Remote demo seeding is blocked by default. |

`STORAGE_MODE=local` stores uploads locally and does not require Cloudinary. `cloudinary` uses Cloudinary only. `both` uploads to Cloudinary and also stores a local copy, so both providers must be configured.

## Common Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server with Turbopack. |
| `npm run build` | Generate the Prisma client and create a production build. |
| `npm run start` | Serve a previously built application. |
| `npm run lint` | Run the configured Next.js lint command. |
| `npx tsc --noEmit` | Run a TypeScript check without emitting files. |
| `npm run db:push` | Push the Prisma schema to MongoDB. |
| `npm run db:seed` | Add local demo accounts, categories, tags, and sample content. |
| `npm run db:studio` | Open Prisma Studio for database inspection. |

The seed script is disabled in production and restricted to local MongoDB by default. It creates demo content and may create demo accounts when the relevant seed variables are set. Do not run it against production data. Setting `ALLOW_REMOTE_DEMO_SEED=true` explicitly permits remote seeding and should only be done when that is intended.

## Features: Implemented and Not Implemented

### Implemented

- Role-based reader, employee, and administrator accounts with password hashing and protected dashboard/API routes.
- Admin employee management, blog moderation, category/tag management, and analytics.
- Employee blog creation and editing, drafts, publishing, automatic slug generation, and draft auto-save.
- Rich-text editing for headings, bold/italic/underline, lists, links, images, code blocks, quotes, and dividers.
- Cover-image and editor-image uploads with server-side image validation and optimization.
- Public blog listings and detail pages, search and category/tag filters, related posts, reading-time estimates, and pagination.
- Reader likes and comments, view tracking, and PDF downloads.
- Admin analytics with date filters and CSV/Excel report exports.
- Dark mode.
- Optional Gemini AI writing tools, custom instructions, copyable results, and public blog reading assistance.
- Demo seed data for sample accounts, blogs, categories, tags, and reader activity.

### Not Implemented

- Scheduled publishing. Employees cannot currently select a future publication time.
- Forgot-password recovery with an email OTP.
- Google sign-in or other OAuth login.
- Automatic fallback to a second AI provider when Gemini is unavailable.

## Known Limitations

- AI requests depend on Gemini availability, model access, and account quota. The app reports overload, timeout, and quota errors, but cannot make an unavailable or quota-limited provider succeed.
- The `both` image-storage mode requires valid Cloudinary credentials and a writable local upload directory. It reports a failure if either storage destination fails. The Cloudinary account used during setup returned HTTP 403, so its credentials and upload permissions need verification before relying on this mode.
- Local image storage writes to `public/uploads`. This is suitable for local development, but deployment platforms with ephemeral or read-only filesystems need persistent storage configured; use Cloudinary-only storage there if local persistence is unavailable.
- The admin provisioning page requires `ADMIN_PROVISIONING_KEY`. Rotate or remove the key after initial setup if further administrator provisioning is not needed.
- The demo seed is blocked for remote databases unless `ALLOW_REMOTE_DEMO_SEED=true` is explicitly set. It is not intended for production and can add many sample records.
- There is no configured automated test suite. TypeScript checking is available with `npx tsc --noEmit`; the lint command may require a compatible ESLint configuration.

## Application Structure

```text
.
|-- app/
|   |-- (auth)/
|   |   |-- admin-setup/             First administrator provisioning
|   |   |-- login/                   Sign-in page
|   |   `-- signup/                  Reader registration
|   |-- (public)/
|   |   |-- blog/[slug]/             Published article pages
|   |   |-- search/                  Public search and filters
|   |   |-- layout.tsx               Public site shell
|   |   `-- page.tsx                 Public home page
|   |-- api/
|   |   |-- ai/                      Gemini-backed writing and reading actions
|   |   |-- auth/                    Login, signup, logout, and provisioning
|   |   |-- blogs/                   Blog CRUD, publishing, comments, and likes
|   |   |-- categories/              Category endpoints
|   |   |-- employees/               Employee administration endpoints
|   |   |-- reports/                 Analytics exports
|   |   |-- stats/                   Admin and employee statistics
|   |   |-- tags/                    Tag endpoints
|   |   `-- upload/                  Image upload endpoint
|   |-- dashboard/
|   |   |-- admin/                   Admin pages and management tools
|   |   |-- employee/                Employee authoring and blog management
|   |   `-- layout.tsx               Protected dashboard shell
|   |-- globals.css                  Global styles and design tokens
|   `-- layout.tsx                   Root layout and site metadata
|-- components/
|   |-- admin/                       Analytics, employees, blogs, and taxonomy UI
|   |-- ai/                          AI assistant panels
|   |-- auth/                        Sign-in, signup, and admin setup forms
|   |-- blog/                        Article content rendering
|   |-- dashboard/                   Dashboard filters and shared controls
|   |-- editor/                      Rich-text authoring experience
|   |-- employee/                    Employee blog forms and tables
|   |-- layout/                      Public header, dashboard shell, theme controls
|   |-- providers/                   Application context providers
|   |-- public/                      Blog cards, engagement, search, and tracking
|   `-- ui/                          Reusable accessible UI primitives
|-- hooks/                           Client-side application hooks
|-- lib/
|   |-- ai/                          AI provider, actions, and request handling
|   |-- auth/                        Password, JWT, and session utilities
|   |-- db/                          Prisma client
|   |-- permissions/                 Role and access rules
|   |-- services/                    Blog and statistics domain services
|   |-- storage/                     Local and Cloudinary storage adapters
|   |-- utils/                       Shared formatting and sanitization helpers
|   `-- validation/                  Zod request schemas
|-- prisma/
|   |-- schema.prisma                MongoDB data model
|   `-- seed.ts                      Restricted local demo seed
|-- public/
|   |-- images/                      Static image assets
|   `-- uploads/                     Local image storage
|-- middleware.ts                    Dashboard route authentication
|-- next-env.d.ts                    Next.js TypeScript declarations
|-- next.config.ts                   Next.js configuration
|-- package.json                     Scripts and dependencies
|-- package-lock.json                Reproducible npm dependency lockfile
|-- postcss.config.mjs               PostCSS configuration
|-- tailwind.config.ts               Tailwind theme configuration
`-- tsconfig.json                    TypeScript configuration
```

### Directory Responsibilities

- `app/` owns routing, layouts, server-rendered pages, and HTTP route handlers. Route groups such as `(auth)` and `(public)` organize pages without adding URL segments.
- `components/` contains presentation and interaction code grouped by product domain; `components/ui/` holds reusable primitives.
- `lib/` contains domain logic and integrations that should not be tied to a specific page. API handlers should delegate reusable operations to these modules where appropriate.
- `prisma/` is the source of truth for the MongoDB data model and development seed behavior.
- `public/` contains files served directly by Next.js and the local upload directory when local storage is enabled.

Authorization is enforced in server routes and dashboard middleware; client-side navigation is not a security boundary. Generated output and dependencies such as `.next/` and `node_modules/` are intentionally excluded from this source tree.

## Data and Content Lifecycle

The Prisma schema defines users, blogs, categories, tags, blog views, comments, and likes. Blog statuses are `DRAFT`, `PUBLISHED`, and `UNPUBLISHED`. Prisma schema changes should be applied with `npm run db:push`; this project uses MongoDB rather than relational migration files.

Deleting an employee also deletes related authored content and engagement records according to the Prisma relations. Confirm destructive actions carefully, especially against non-development databases.

## Deployment Checklist

1. Provision MongoDB Atlas and allow network access only from trusted deployment and administrative IPs.
2. Configure all required environment variables in the deployment platform's secret manager; never commit `.env` files.
3. Set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS origin.
4. Set `STORAGE_MODE` and provide the corresponding Cloudinary credentials when needed.
5. Provide `GEMINI_API_KEY` only if AI features are enabled.
6. Install dependencies and build with `npm ci` and `npm run build`.
7. Provision an administrator through `/admin-setup`, then rotate or remove the provisioning key if no longer needed.
8. Keep demo seeding disabled for production and use least-privilege database credentials.

## Troubleshooting

### Atlas reports `ReplicaSetNoPrimary` or a TLS/server-selection error

Confirm the cluster is running, the deployment host's current IP is allowed in Atlas Network Access, outbound TCP port `27017` is available, and VPNs or TLS-inspecting proxies are not interfering. Verify the database user's credentials and percent-encode reserved characters in the password. Restart the Next.js server after changing environment variables.

### Atlas reports `empty database name not allowed`

Include a database path in `DATABASE_URL`, for example `/blog_builder` before any query parameters. Restart the application after editing the environment file.

### AI requests are unavailable

Confirm `GEMINI_API_KEY` is configured on the server, the selected model is available to the key, and the provider quota has not been exceeded. AI credentials must not use a `NEXT_PUBLIC_` variable.

### Image uploads fail

Check that `STORAGE_MODE` matches the configured provider. `cloudinary` and `both` require all three Cloudinary variables. Local uploads require the application process to have write access to the upload directory.

## Security Notes

- Do not commit `.env`, `.env.local`, API keys, database credentials, or production exports.
- Use unique, high-entropy secrets for `JWT_SECRET` and `ADMIN_PROVISIONING_KEY`.
- Rotate any credential that has been exposed in logs, screenshots, chat, or source control.
- Restrict Atlas network access and use a dedicated database user with only the privileges the application needs.
- Use HTTPS in production and configure secrets through the hosting provider, not through client-side code.
- Avoid seeding demo data into production or any database containing real user data.
