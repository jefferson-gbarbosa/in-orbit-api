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
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
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

// src/http/routes/create-goal-completion.ts
var create_goal_completion_exports = {};
__export(create_goal_completion_exports, {
  createGoalCompletionRoute: () => createGoalCompletionRoute
});
module.exports = __toCommonJS(create_goal_completion_exports);

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

// src/app/functions/create-goal-completion.ts
var import_dayjs = __toESM(require("dayjs"));
var import_weekOfYear = __toESM(require("dayjs/plugin/weekOfYear"));
var import_drizzle_orm = require("drizzle-orm");
import_dayjs.default.extend(import_weekOfYear.default);
async function createGoalCompletion({
  goalId
}) {
  const currentYear = (0, import_dayjs.default)().year();
  const currentWeek = (0, import_dayjs.default)().week();
  const goalCompletionCounts = db.$with("goal_completion_counts").as(
    db.select({
      goalId: goalCompletions.goalId,
      completionCount: import_drizzle_orm.sql`COUNT(${goalCompletions.id})`.as(
        "completionCount"
      )
    }).from(goalCompletions).where(
      (0, import_drizzle_orm.and)(
        (0, import_drizzle_orm.eq)(goalCompletions.goalId, goalId),
        import_drizzle_orm.sql`EXTRACT(YEAR FROM ${goalCompletions.createdAt}) = ${currentYear}`,
        import_drizzle_orm.sql`EXTRACT(WEEK FROM ${goalCompletions.createdAt}) = ${currentWeek}`
      )
    ).groupBy(goalCompletions.goalId)
  );
  const result = await db.with(goalCompletionCounts).select({
    isIncomplete: import_drizzle_orm.sql`
        COALESCE(${goals.desiredWeeklyFrequency}, 0) > COALESCE(${goalCompletionCounts.completionCount}, 0)
      `
  }).from(goals).leftJoin(goalCompletionCounts, (0, import_drizzle_orm.eq)(goals.id, goalCompletionCounts.goalId)).where((0, import_drizzle_orm.eq)(goals.id, goalId)).limit(1);
  const { isIncomplete } = result[0];
  if (!isIncomplete) {
    throw new Error("Goal already completed this week!");
  }
  const [goalCompletion] = await db.insert(goalCompletions).values({
    goalId
  }).returning();
  return {
    goalCompletion
  };
}

// src/http/routes/create-goal-completion.ts
var import_zod2 = require("zod");
var createGoalCompletionRoute = async (app) => {
  app.post(
    "/completions",
    {
      schema: {
        body: import_zod2.z.object({
          goalId: import_zod2.z.string()
        })
      }
    },
    async (request) => {
      const { goalId } = request.body;
      const { goalCompletion } = await createGoalCompletion({
        goalId
      });
      return { goalCompletionId: goalCompletion.id };
    }
  );
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createGoalCompletionRoute
});
