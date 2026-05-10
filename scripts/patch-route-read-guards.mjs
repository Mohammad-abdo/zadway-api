/**
 * Adds requireResourceAccess(PERM) to GET list and GET by id routes for admin CRUD modules.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modulesDir = path.join(__dirname, "../src/modules");

const files = [];
function walk(dir) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walk(p);
    else if (name.name.endsWith(".routes.js")) files.push(p);
  }
}
walk(modulesDir);

let updated = 0;
for (const file of files) {
  let s = fs.readFileSync(file, "utf8");
  if (s.includes("requireResourceAccess")) continue;
  if (!s.includes("requirePermission")) continue;
  if (!s.includes('r.get("/", authenticate')) continue;

  s = s.replace(
    /import \{ requirePermission \} from "\.\.\/\.\.\/core\/middlewares\/authorize\.middleware\.js";/g,
    'import { requirePermission, requireResourceAccess } from "../../core/middlewares/authorize.middleware.js";'
  );

  s = s.replace(/r\.get\("\/", authenticate, validate/g, 'r.get("/", authenticate, requireResourceAccess(PERM), validate');
  s = s.replace(/r\.get\("\/:id", authenticate, validate/g, 'r.get("/:id", authenticate, requireResourceAccess(PERM), validate');

  fs.writeFileSync(file, s);
  updated += 1;
}

console.log("Patched routes files:", updated);
