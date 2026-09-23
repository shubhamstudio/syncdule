# SYNCDULE

SYNCDULE is an AI-assisted social media planning and scheduling workspace created and maintained by Shubham Bisht.

## Ownership

SYNCDULE is owned by Shubham Bisht. The product name, original work, and project-specific modifications are © 2026 Shubham Bisht. See [LICENSE](LICENSE) for the terms that apply to this repository.

## Features

- Clerk authentication and subscription-based feature access
- Social account connections through OAuth 2.0
- Per-platform post composition and previews
- Calendar and list scheduling views
- Inngest background jobs for scheduled publishing
- X/Twitter and LinkedIn publishing with image support
- AI drafting, rewriting, and idea generation through InsForge
- Drag-and-drop content idea board
- InsForge database, row-level security, storage, and AI gateway

## Local setup

1. Install dependencies with `npm install`.
2. Copy the documented settings from `.env.example` into `.env.local`, or keep existing values in `.env` and override only the settings you need locally.
3. Configure the Clerk JWT template named `insforge` and add the application callback URL to each social provider.
4. Create or select the InsForge storage bucket named by `INSFORGE_STORAGE_BUCKET`.
5. Run the application with `npm run dev`.

The social OAuth callback is:

```text
{NEXT_PUBLIC_APP_URL}/api/channel/callback
```

## Integration status

X/Twitter and LinkedIn have publishing implementations. Other platforms currently have preview and OAuth configuration scaffolding but require provider-specific connection and publishing adapters before they should be enabled in production.

## License

SYNCDULE is proprietary software licensed by Shubham Bisht. The repository is not open source and may not be copied, modified, distributed, or used without written permission from Shubham Bisht.

Some components may be subject to separate third-party or upstream license terms. Those terms continue to apply to the applicable components.
