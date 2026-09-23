/**
 * Creates the channel_types and user_channels tables via InsForge SQL migration endpoint,
 * then seeds the 4 supported channel types.
 *
 * Usage: node --env-file=.env.local scripts/seed-channels.mjs
 */

const BASE_URL = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL?.replace(/\/$/, "");
const PROJECT_API_KEY = process.env.INSFORGE_PROJECT_API_KEY;
const PROJECT_ID = "48bad263-86a8-4e27-9ddf-db6ac852e35c";

if (!BASE_URL || !PROJECT_API_KEY) {
  console.error("❌  Missing env vars.");
  process.exit(1);
}

// Try various InsForge SQL execution endpoints
async function trySQLEndpoints(sql) {
  const endpoints = [
    { url: `${BASE_URL}/rest/v1/`, method: "POST", body: { query: sql } },
  ];

  // Try the migrations endpoint
  const migrationEndpoints = [
    `https://api.insforge.dev/v1/projects/${PROJECT_ID}/database/migrations`,
    `${BASE_URL}/api/migrations`,
  ];

  for (const endpoint of migrationEndpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${PROJECT_API_KEY}`,
          "x-api-key": PROJECT_API_KEY,
        },
        body: JSON.stringify({ sql }),
      });
      const text = await res.text();
      console.log(`  ${endpoint}: ${res.status} ${text.slice(0, 200)}`);
    } catch (e) {
      console.log(`  ${endpoint}: ${e.message}`);
    }
  }
}

const createSQL = `
CREATE TABLE IF NOT EXISTS public.channel_types (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type            text NOT NULL UNIQUE,
  name            text NOT NULL,
  color           text NOT NULL DEFAULT '#000000',
  character_limit integer NOT NULL DEFAULT 280,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_channels (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             text NOT NULL,
  channel_type_id     uuid NOT NULL REFERENCES public.channel_types(id) ON DELETE CASCADE,
  handle              text,
  profile_image       text,
  profile_url         text,
  provider_account_id text,
  access_token        text,
  refresh_token       text,
  token_expires_at    timestamptz,
  is_connected        boolean DEFAULT true,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE(user_id, channel_type_id)
);

INSERT INTO public.channel_types (type, name, color, character_limit) VALUES
  ('LINKEDIN',  'LinkedIn',  '#2867B2', 3000),
  ('INSTAGRAM', 'Instagram', '#E4405F', 2200),
  ('FACEBOOK',  'Facebook',  '#1877F2', 63206),
  ('YOUTUBE',   'YouTube',   '#FF0000', 5000)
ON CONFLICT (type) DO UPDATE
  SET name = EXCLUDED.name,
      color = EXCLUDED.color,
      character_limit = EXCLUDED.character_limit;
`;

console.log("🔍  Probing InsForge SQL endpoints…");
await trySQLEndpoints(createSQL);
