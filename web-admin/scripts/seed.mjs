import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const loadServiceAccount = async () => {
  const jsonString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonString) {
    return JSON.parse(jsonString);
  }
  const filePath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!filePath) {
    throw new Error(
      "Missing service account. Set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS",
    );
  }
  const fullPath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  const content = await readFile(fullPath, "utf8");
  return JSON.parse(content);
};

const toTimestamp = (val) => {
  if (!val) return undefined;
  if (val._seconds || val.seconds) {
    return new admin.firestore.Timestamp(val.seconds ?? val._seconds, val.nanoseconds ?? 0);
  }
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return undefined;
  return admin.firestore.Timestamp.fromDate(d);
};

const normalizeDoc = (doc) => {
  const clone = { ...doc };
  if (clone.createdAt) {
    const ts = toTimestamp(clone.createdAt);
    if (ts) clone.createdAt = ts;
  }
  return clone;
};

const seedCollection = async (col, data) => {
  const batch = admin.firestore().batch();
  data.forEach((item) => {
    const { id, ...rest } = item;
    const ref = admin.firestore().collection(col).doc(id || undefined);
    batch.set(ref, normalizeDoc(rest), { merge: true });
  });
  await batch.commit();
  console.log(`Seeded ${col}: ${data.length} docs`);
};

const main = async () => {
  const serviceAccount = await loadServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  const dataPath = path.join(__dirname, "..", "sample-data.json");
  const raw = await readFile(dataPath, "utf8");
  const data = JSON.parse(raw);

  await seedCollection("cities", data.cities ?? []);
  await seedCollection("events", data.events ?? []);
  await seedCollection("sections", data.sections ?? []);
  await seedCollection("orders", data.orders ?? []);
  await seedCollection("users", data.users ?? []);

  console.log("Done.");
  process.exit(0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

