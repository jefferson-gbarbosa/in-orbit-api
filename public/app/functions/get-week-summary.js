"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/app/functions/get-week-summary.ts
var get_week_summary_exports = {};
__export(get_week_summary_exports, {
  getWeekSummary: () => getWeekSummary
});
module.exports = __toCommonJS(get_week_summary_exports);

// src/env.ts
var import_zod = require("zod");
var envSchema = import_zod.z.object({
  DATABASE_URL: import_zod.z.string().url()
});
var env = envSchema.parse(process.env);

// src/db/index.ts
var import_postgres_js = require("drizzle-orm/postgres-js");
var import_postgres = __toESM(require("postgres"));

// src/db/schema/index.ts
var schema_exports = {};
__export(schema_exports, {
  goalCompletions: () => goalCompletions,
  goals: () => goals
});

// src/db/schema/goals.ts
var import_cuid2 = require("@paralleldrive/cuid2");
var import_pg_core = require("drizzle-orm/pg-core");
var goals = (0, import_pg_core.pgTable)("goals", {
  id: (0, import_pg_core.text)("id").primaryKey().$defaultFn(() => (0, import_cuid2.createId)()),
  title: (0, import_pg_core.text)("title").notNull(),
  desiredWeeklyFrequency: (0, import_pg_core.integer)("desired_weekly_frequency").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at", { withTimezone: true }).notNull().defaultNow()
});

// src/db/schema/goal-completions.ts
var import_cuid22 = require("@paralleldrive/cuid2");
var import_pg_core2 = require("drizzle-orm/pg-core");
var goalCompletions = (0, import_pg_core2.pgTable)("goal_completions", {
  id: (0, import_pg_core2.text)("id").primaryKey().$defaultFn(() => (0, import_cuid22.createId)()),
  goalId: (0, import_pg_core2.text)("goal_id").references(() => goals.id).notNull(),
  createdAt: (0, import_pg_core2.timestamp)("created_at", { withTimezone: true }).notNull().defaultNow()
});

// src/db/index.ts
var client = (0, import_postgres.default)(env.DATABASE_URL);
var db = (0, import_postgres_js.drizzle)(client, { schema: schema_exports });

// src/app/functions/get-week-summary.ts
var import_dayjs = __toESM(require("dayjs"));
var import_weekOfYear = __toESM(require("dayjs/plugin/weekOfYear"));
var import_drizzle_orm = require("drizzle-orm");
import_dayjs.default.extend(import_weekOfYear.default);
async function getWeekSummary() {
  const currentYear = (0, import_dayjs.default)().year();
  const currentWeek = (0, import_dayjs.default)().week();
  const goalsCreatedUpToWeek = db.$with("goals_created_up_to_week").as(
    db.select({
      id: goals.id,
      title: goals.title,
      desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
      createdAt: goals.createdAt
    }).from(goals).where(
      (0, import_drizzle_orm.and)(
        import_drizzle_orm.sql`EXTRACT(YEAR FROM ${goals.createdAt}) <= ${currentYear}`,
        import_drizzle_orm.sql`EXTRACT(WEEK FROM ${goals.createdAt}) <= ${currentWeek}`
      )
    )
  );
  const goalsCompletedInWeek = db.$with("goals_completed_in_week").as(
    db.select({
      id: goalCompletions.id,
      title: goals.title,
      createdAt: goalCompletions.createdAt,
      completionDate: import_drizzle_orm.sql`DATE(${goalCompletions.createdAt})`.as(
        "completionDate"
      )
    }).from(goalCompletions).orderBy((0, import_drizzle_orm.desc)(goalCompletions.createdAt)).innerJoin(goals, (0, import_drizzle_orm.eq)(goals.id, goalCompletions.goalId)).where(
      (0, import_drizzle_orm.and)(
        import_drizzle_orm.sql`EXTRACT(YEAR FROM ${goals.createdAt}) = ${currentYear}`,
        import_drizzle_orm.sql`EXTRACT(WEEK FROM ${goals.createdAt}) = ${currentWeek}`
      )
    )
  );
  const goalsCompletedByWeekDay = db.$with("goals_completed_by_week_day").as(
    db.select({
      completionDate: goalsCompletedInWeek.completionDate,
      completions: import_drizzle_orm.sql`
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', ${goalsCompletedInWeek.id},
            'title', ${goalsCompletedInWeek.title},
            'createdAt', ${goalsCompletedInWeek.createdAt}
          )
        )
      `.as("completions")
    }).from(goalsCompletedInWeek).groupBy(goalsCompletedInWeek.completionDate)
  );
  const [summary] = await db.with(goalsCreatedUpToWeek, goalsCompletedInWeek, goalsCompletedByWeekDay).select({
    completed: import_drizzle_orm.sql`
        (SELECT COUNT(*) FROM ${goalsCompletedInWeek})::DECIMAL
      `.mapWith(Number),
    total: import_drizzle_orm.sql`
        (SELECT SUM(${goalsCreatedUpToWeek.desiredWeeklyFrequency}) FROM ${goalsCreatedUpToWeek})::DECIMAL
      `.mapWith(Number),
    goalsPerDay: import_drizzle_orm.sql`
        JSON_OBJECT_AGG(${goalsCompletedByWeekDay.completionDate}, ${goalsCompletedByWeekDay.completions})
      `
  }).from(goalsCompletedByWeekDay);
  return { summary };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getWeekSummary
});
