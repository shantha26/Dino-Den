// One-off utility: resets the admin security password (the extra password
// asked for when opening Settings — separate from your login password) to
// a known value for every admin account.
//
// Usage (from the backend folder):
//   node scripts/setAdminSecurityPassword.js
//   node scripts/setAdminSecurityPassword.js 1234        (custom value)
//   node scripts/setAdminSecurityPassword.js --email a@b.com 1234   (one account only)
//
// Reads MONGODB_URI from backend/.env, same as server.js.

import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/kids_play_area";

function parseArgs(argv) {
  let email = null;
  let password = "0806";
  const rest = [...argv];
  const emailFlagIdx = rest.indexOf("--email");
  if (emailFlagIdx !== -1) {
    email = rest[emailFlagIdx + 1];
    rest.splice(emailFlagIdx, 2);
  }
  if (rest[0]) password = rest[0];
  return { email, password };
}

async function main() {
  const { email, password } = parseArgs(process.argv.slice(2));

  if (password.length < 4) {
    console.error("Security password should be at least 4 characters.");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);

  const query = { role: "admin" };
  if (email) query.email = email.toLowerCase().trim();

  const admins = await User.find(query);

  if (admins.length === 0) {
    console.error(
      email
        ? `No admin account found with email ${email}.`
        : "No admin accounts found in this database."
    );
    process.exit(1);
  }

  for (const admin of admins) {
    await admin.setAdminSecurityPassword(password);
    await admin.save();
    console.log(`✔ ${admin.email} — Settings security password set to "${password}"`);
  }

  console.log(`\nDone. ${admins.length} admin account(s) updated.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
