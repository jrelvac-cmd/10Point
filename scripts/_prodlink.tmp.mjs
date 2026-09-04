import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync(".env.local","utf8").split("\n").filter(l=>l.includes("=")&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(), l.slice(i+1).trim()];}));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});
const APP = "https://10-point-kappa.vercel.app";
const mail = `prodtest_${Date.now()}@example.com`;
const { data, error } = await admin.auth.admin.generateLink({
  type: "signup", email: mail, password: "Test-1234-abcd",
  options: { redirectTo: `${APP}/auth/callback`, data: { username: "p"+Date.now().toString().slice(-6) } },
});
if (error) { console.log("ECHEC:", error.message); process.exit(1); }
fs.writeFileSync("scripts/_prodlink.tmp.txt", data.properties.action_link);
console.log(data.properties.action_link);
