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

// api/http/index.ts
var import_fastify = __toESM(require("fastify"));
var import_cors = __toESM(require("@fastify/cors"));
var import_fastify_type_provider_zod = require("fastify-type-provider-zod");
var import_swagger = __toESM(require("@fastify/swagger"));
var import_swagger_ui = __toESM(require("@fastify/swagger-ui"));

// api/env.ts
var import_zod = require("zod");
var envSchema = import_zod.z.object({
  DATABASE_URL: import_zod.z.string().url()
});
var env = envSchema.parse(process.env);

// api/db/index.ts
var import_postgres_js = require("drizzle-orm/postgres-js");
var import_postgres = __toESM(require("postgres"));

// api/db/schema/index.ts
var schema_exports = {};
__export(schema_exports, {
  goalCompletions: () => goalCompletions,
  goals: () => goals
});

// api/db/schema/goals.ts
var import_cuid2 = require("@paralleldrive/cuid2");
var import_pg_core = require("drizzle-orm/pg-core");
var goals = (0, import_pg_core.pgTable)("goals", {
  id: (0, import_pg_core.text)("id").primaryKey().$defaultFn(() => (0, import_cuid2.createId)()),
  title: (0, import_pg_core.text)("title").notNull(),
  desiredWeeklyFrequency: (0, import_pg_core.integer)("desired_weekly_frequency").notNull(),
  createdAt: (0, import_pg_core.timestamp)("created_at", { withTimezone: true }).notNull().defaultNow()
});

// api/db/schema/goal-completions.ts
var import_cuid22 = require("@paralleldrive/cuid2");
var import_pg_core2 = require("drizzle-orm/pg-core");
var goalCompletions = (0, import_pg_core2.pgTable)("goal_completions", {
  id: (0, import_pg_core2.text)("id").primaryKey().$defaultFn(() => (0, import_cuid22.createId)()),
  goalId: (0, import_pg_core2.text)("goal_id").references(() => goals.id).notNull(),
  createdAt: (0, import_pg_core2.timestamp)("created_at", { withTimezone: true }).notNull().defaultNow()
});

// api/db/index.ts
var client = (0, import_postgres.default)(env.DATABASE_URL);
var db = (0, import_postgres_js.drizzle)(client, { schema: schema_exports });

// api/app/functions/create-goal.ts
async function createGoal({
  title,
  desiredWeeklyFrequency
}) {
  const [goal] = await db.insert(goals).values({
    title,
    desiredWeeklyFrequency
  }).returning();
  return { goal };
}

// api/http/routes/create-goal.ts
var import_zod2 = require("zod");
var createGoalRoute = async (app2) => {
  app2.post(
    "/goals",
    {
      schema: {
        body: import_zod2.z.object({
          title: import_zod2.z.string(),
          desiredWeeklyFrequency: import_zod2.z.number().int().min(1).max(7)
        })
      }
    },
    async (request) => {
      const { title, desiredWeeklyFrequency } = request.body;
      const { goal } = await createGoal({
        title,
        desiredWeeklyFrequency
      });
      return { goalId: goal.id };
    }
  );
};

// api/app/functions/create-goal-completion.ts
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

// api/http/routes/create-goal-completion.ts
var import_zod3 = require("zod");
var createGoalCompletionRoute = async (app2) => {
  app2.post(
    "/completions",
    {
      schema: {
        body: import_zod3.z.object({
          goalId: import_zod3.z.string()
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

// api/app/functions/get-week-summary.ts
var import_dayjs2 = __toESM(require("dayjs"));
var import_weekOfYear2 = __toESM(require("dayjs/plugin/weekOfYear"));
var import_drizzle_orm2 = require("drizzle-orm");
import_dayjs2.default.extend(import_weekOfYear2.default);
async function getWeekSummary() {
  const currentYear = (0, import_dayjs2.default)().year();
  const currentWeek = (0, import_dayjs2.default)().week();
  const goalsCreatedUpToWeek = db.$with("goals_created_up_to_week").as(
    db.select({
      id: goals.id,
      title: goals.title,
      desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
      createdAt: goals.createdAt
    }).from(goals).where(
      (0, import_drizzle_orm2.and)(
        import_drizzle_orm2.sql`EXTRACT(YEAR FROM ${goals.createdAt}) <= ${currentYear}`,
        import_drizzle_orm2.sql`EXTRACT(WEEK FROM ${goals.createdAt}) <= ${currentWeek}`
      )
    )
  );
  const goalsCompletedInWeek = db.$with("goals_completed_in_week").as(
    db.select({
      id: goalCompletions.id,
      title: goals.title,
      createdAt: goalCompletions.createdAt,
      completionDate: import_drizzle_orm2.sql`DATE(${goalCompletions.createdAt})`.as(
        "completionDate"
      )
    }).from(goalCompletions).orderBy((0, import_drizzle_orm2.desc)(goalCompletions.createdAt)).innerJoin(goals, (0, import_drizzle_orm2.eq)(goals.id, goalCompletions.goalId)).where(
      (0, import_drizzle_orm2.and)(
        import_drizzle_orm2.sql`EXTRACT(YEAR FROM ${goals.createdAt}) = ${currentYear}`,
        import_drizzle_orm2.sql`EXTRACT(WEEK FROM ${goals.createdAt}) = ${currentWeek}`
      )
    )
  );
  const goalsCompletedByWeekDay = db.$with("goals_completed_by_week_day").as(
    db.select({
      completionDate: goalsCompletedInWeek.completionDate,
      completions: import_drizzle_orm2.sql`
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
    completed: import_drizzle_orm2.sql`
        (SELECT COUNT(*) FROM ${goalsCompletedInWeek})::DECIMAL
      `.mapWith(Number),
    total: import_drizzle_orm2.sql`
        (SELECT SUM(${goalsCreatedUpToWeek.desiredWeeklyFrequency}) FROM ${goalsCreatedUpToWeek})::DECIMAL
      `.mapWith(Number),
    goalsPerDay: import_drizzle_orm2.sql`
        JSON_OBJECT_AGG(${goalsCompletedByWeekDay.completionDate}, ${goalsCompletedByWeekDay.completions})
      `
  }).from(goalsCompletedByWeekDay);
  return { summary };
}

// api/http/routes/get-week-summary.ts
var getWeekSummaryRoute = async (app2) => {
  app2.get("/summary", {}, async () => {
    const { summary } = await getWeekSummary();
    return { summary };
  });
};

// api/app/functions/get-week-pending-goals.ts
var import_dayjs3 = __toESM(require("dayjs"));
var import_weekOfYear3 = __toESM(require("dayjs/plugin/weekOfYear"));
var import_drizzle_orm3 = require("drizzle-orm");
import_dayjs3.default.extend(import_weekOfYear3.default);
async function getWeekPendingGoals() {
  const currentYear = (0, import_dayjs3.default)().year();
  const currentWeek = (0, import_dayjs3.default)().week();
  const goalsCreatedUpToWeek = db.$with("goals_created_up_to_week").as(
    db.select({
      id: goals.id,
      title: goals.title,
      desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
      createdAt: goals.createdAt
    }).from(goals).where(
      (0, import_drizzle_orm3.and)(
        import_drizzle_orm3.sql`EXTRACT(YEAR FROM ${goals.createdAt}) <= ${currentYear}`,
        import_drizzle_orm3.sql`EXTRACT(WEEK FROM ${goals.createdAt}) <= ${currentWeek}`
      )
    )
  );
  const goalCompletionCounts = db.$with("goal_completion_counts").as(
    db.select({
      goalId: goals.id,
      completionCount: (0, import_drizzle_orm3.count)(goalCompletions.id).as("completionCount")
    }).from(goalCompletions).innerJoin(goals, (0, import_drizzle_orm3.eq)(goals.id, goalCompletions.goalId)).groupBy(goals.id)
  );
  const pendingGoals = await db.with(goalsCreatedUpToWeek, goalCompletionCounts).select({
    id: goalsCreatedUpToWeek.id,
    title: goalsCreatedUpToWeek.title,
    desiredWeeklyFrequency: goalsCreatedUpToWeek.desiredWeeklyFrequency,
    completionCount: import_drizzle_orm3.sql`COALESCE(${goalCompletionCounts.completionCount}, 0)`.mapWith(
      Number
    )
  }).from(goalsCreatedUpToWeek).orderBy((0, import_drizzle_orm3.asc)(goalsCreatedUpToWeek.createdAt)).leftJoin(
    goalCompletionCounts,
    (0, import_drizzle_orm3.eq)(goalsCreatedUpToWeek.id, goalCompletionCounts.goalId)
  );
  return { pendingGoals };
}

// api/http/routes/get-week-pending-goals.ts
var getWeekPendingGoalsRoute = async (app2) => {
  app2.get("/pending-goals", {}, async () => {
    const { pendingGoals } = await getWeekPendingGoals();
    return { pendingGoals };
  });
};

// api/http/index.ts
var app = (0, import_fastify.default)().withTypeProvider();
app.register(import_cors.default, { origin: "*" });
app.register(import_swagger.default, {
  swagger: {
    consumes: ["application/json"],
    produces: ["application/json"],
    info: {
      title: "in.orbit",
      description: "Especifica\xE7\xF5es da API para o back-end da aplica\xE7\xE3o in.orbit constru\xEDda durante o NLW Pocket da Rocketseat.",
      version: "1.0.0"
    }
  },
  transform: import_fastify_type_provider_zod.jsonSchemaTransform
});
app.register(import_swagger_ui.default, {
  routePrefix: "/docs"
});
app.setValidatorCompiler(import_fastify_type_provider_zod.validatorCompiler);
app.setSerializerCompiler(import_fastify_type_provider_zod.serializerCompiler);
app.register(createGoalRoute);
app.register(createGoalCompletionRoute);
app.register(getWeekSummaryRoute);
app.register(getWeekPendingGoalsRoute);
app.listen({ port: 3333, host: "0.0.0.0" }).then(() => {
  console.log("HTTP server running!");
});
