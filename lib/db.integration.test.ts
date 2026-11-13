// Hits the linked Supabase project as real users. Skipped when .env.local has no test users (e.g. CI).
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_PALETTE, EMPTY_SPONSOR_CONTENT } from "./contract";

try { process.loadEnvFile(".env.local"); } catch { /* no local env */ }
const env = process.env;
const ready = !!(env.NEXT_PUBLIC_SUPABASE_URL && env.TEST_USER_A_EMAIL && env.TEST_USER_B_EMAIL);

const client = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });

async function admin(email: string, password: string) {
  const c = client();
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const { data } = await c.from("organizations").select("id").maybeSingle();
  const org = data ?? (await c.from("organizations").insert({ name: `Test org ${email}` }).select("id").single()).data!;
  return { c, orgId: org.id as string };
}

const cta = { enabled: true, heading: "Renew", body: "", buttonLabel: "Renew", url: "https://renew.test" };

describe.skipIf(!ready)("database rules (live project)", () => {
  let A: SupabaseClient, B: SupabaseClient, anon: SupabaseClient;
  let eventId: string, sponsorId: string;
  const eventSlug = `it-${Date.now()}`;

  beforeAll(async () => {
    const a = await admin(env.TEST_USER_A_EMAIL!, env.TEST_USER_A_PASSWORD!);
    A = a.c;
    B = (await admin(env.TEST_USER_B_EMAIL!, env.TEST_USER_B_PASSWORD!)).c;
    anon = client();
    const ev = await A.from("events").insert({
      organization_id: a.orgId, title: "IT Event", slug: eventSlug, brand_colors: DEFAULT_PALETTE, default_cta: cta,
    }).select("id").single();
    expect(ev.error).toBeNull();
    eventId = ev.data!.id;
    const sp = await A.from("sponsors").insert({ event_id: eventId, name: "Cafe", slug: "cafe", draft_content: EMPTY_SPONSOR_CONTENT }).select("id").single();
    expect(sp.error).toBeNull();
    sponsorId = sp.data!.id;
  });

  afterAll(async () => { if (eventId) await A.from("events").delete().eq("id", eventId); });

  it("anon can't read tables or unpublished reports", async () => {
    const { data } = await anon.from("sponsors").select("id");
    expect(data ?? []).toEqual([]);
    expect((await anon.rpc("get_published_report", { event_slug: eventSlug, sponsor_slug: "cafe" })).data).toBeNull();
  });

  it("another admin can't see or change the sponsor", async () => {
    expect((await B.from("sponsors").select("id").eq("id", sponsorId)).data).toEqual([]);
    expect((await B.from("sponsors").update({ name: "pwned" }).eq("id", sponsorId).select()).data).toEqual([]);
  });

  it("another admin can't delete the sponsor or event", async () => {
    expect((await B.from("sponsors").delete().eq("id", sponsorId).select()).data).toEqual([]);
    expect((await B.from("events").delete().eq("id", eventId).select()).data).toEqual([]);
    expect((await A.from("sponsors").select("id").eq("id", sponsorId)).data).toHaveLength(1);
  });

  it("public sees only the published snapshot; draft edits don't leak; slug locks", async () => {
    const pub = await A.from("sponsors").update({ published_snapshot: { v: 1, cta }, published_version: 1 }).eq("id", sponsorId).select("published_at").single();
    expect(pub.error).toBeNull();
    expect(pub.data!.published_at).not.toBeNull(); // set by trigger

    await A.from("sponsors").update({ name: "Cafe (edited)" }).eq("id", sponsorId);
    const r = await anon.rpc("get_published_report", { event_slug: eventSlug, sponsor_slug: "cafe" });
    expect(r.data).toEqual({ v: 1, cta });

    const lock = await A.from("sponsors").update({ slug: "other" }).eq("id", sponsorId);
    expect(lock.error?.hint).toBe("locked");
  });

  it("sponsor slugs are unique per event", async () => {
    const dup = await A.from("sponsors").insert({ event_id: eventId, slug: "cafe", draft_content: EMPTY_SPONSOR_CONTENT });
    expect(dup.error?.code).toBe("23505");
  });

  it("rejects non-https CTA in a snapshot and reserved event slugs", async () => {
    const bad = await A.from("sponsors").update({ published_snapshot: { cta: { ...cta, url: "javascript:alert(1)" } } }).eq("id", sponsorId);
    expect(bad.error?.code).toBe("23514");
    const { data: org } = await A.from("organizations").select("id").single();
    const reserved = await A.from("events").insert({ organization_id: org!.id, title: "x", slug: "dashboard", brand_colors: DEFAULT_PALETTE, default_cta: cta });
    expect(reserved.error?.code).toBe("23514");
  });

  it("deleting an event deletes its sponsors (runs last)", async () => {
    expect((await A.from("events").delete().eq("id", eventId).select("id")).data).toHaveLength(1);
    expect((await A.from("sponsors").select("id").eq("id", sponsorId)).data).toEqual([]);
  });
});
