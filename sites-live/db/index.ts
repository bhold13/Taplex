import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import { requireDatabase } from "../lib/runtime";

export function getDb() {
  return drizzle(requireDatabase(), { schema });
}
