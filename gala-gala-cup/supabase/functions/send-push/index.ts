import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "https://esm.sh/jose@5.6.3";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

async function getFirebaseAccessToken(serviceAccount: any) {
  const now = Math.floor(Date.now() / 1000);

  const privateKey = serviceAccount.private_key;
  const clientEmail = serviceAccount.client_email;

  const key = await importPKCS8(privateKey, "RS256");

  const jwt = await new SignJWT({
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data.access_token as string;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors(origin) });
  }

  try {
    const { title, body } = await req.json();
    if (!title || !body) {
      return json({ error: "title and body are required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SERVICE_ROLE_KEY")!;
    const b64 = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON_B64")!;
    const firebaseSa = JSON.parse(atob(b64));



    const supabase = createClient(supabaseUrl, serviceKey);

    // 🔐 Vérifier l'admin
    const auth = req.headers.get("Authorization") ?? "";
    const jwt = auth.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(jwt);
    const userId = userData?.user?.id;

    if (!userId) return json({ error: "Not authenticated" }, 401);

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (profile?.role !== "admin") {
      return json({ error: "Forbidden" }, 403);
    }

    // 📦 Récupérer les tokens
    const { data: rows } = await supabase
      .from("notification_tokens")
      .select("fcm_token")
      .not("fcm_token", "is", null);

    const tokens = (rows ?? []).map((r) => r.fcm_token);
    if (tokens.length === 0) return json({ sent: 0 });

    const accessToken = await getFirebaseAccessToken(firebaseSa);
    const projectId = firebaseSa.project_id;

    let sent = 0;

    for (const token of tokens) {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title, body },
              webpush: {
                notification: {
                  icon: "/icons/gala-192.png",
                },
              },
            },
          }),
        }
      );

      if (res.ok) sent++;
    }

    return new Response(JSON.stringify({ sent, total: tokens.length }), {
      headers: { ...cors(origin), "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: cors(req.headers.get("origin")) }
    );
  }
});
