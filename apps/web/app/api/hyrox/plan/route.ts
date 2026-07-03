import { NextRequest } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { TrainingModel } from "@/lib/models/Training";
import { bearerToken, verifyToken } from "@/lib/auth";
import {
  buildHyroxPlan,
  DIVISIONS,
  DIVISION_LABELS,
  HYROX_TOTAL_WEEKS,
  HYROX_DAYS_PER_WEEK,
  type Division,
} from "@/lib/hyroxPlan";

export const runtime = "nodejs";

/**
 * One-click HYROX plan creator.
 *
 * POST   /api/hyrox/plan        → materialise the full 12-week × 3-day plan from
 *                                 the official preparation document and persist
 *                                 36 Training docs (discipline: "hyrox") under a
 *                                 shared planId.
 *   Body: { division?, targetTimeMin?, replace? }
 *   Returns: { planId, created, weeks, division, trainings }
 *   409 with the existing planId if the user already has a HYROX plan, unless
 *   `replace: true` (or ?replace=true) — then the old plan is wiped first.
 *
 * DELETE /api/hyrox/plan?planId  → remove every training under that HYROX plan.
 *
 * GET    /api/hyrox/plan         → preview the built plan WITHOUT persisting it
 *                                 (deterministic, unauthenticated). Drives the
 *                                 mobile "Terv létrehozása" preview.
 */

function parseDivision(v: unknown): Division {
  return typeof v === "string" && v in DIVISIONS ? (v as Division) : "men_open";
}

function parseTargetTime(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export async function POST(req: NextRequest) {
  const token = bearerToken(req);
  const userId = token ? verifyToken(token)?.userId ?? null : null;
  if (!userId) {
    return Response.json({ detail: "Unauthorized" }, { status: 401 });
  }

  let body: { division?: string; targetTimeMin?: number; replace?: boolean };
  try {
    body = await req.json();
  } catch {
    // Empty body is fine — fall back to defaults (Férfi Open, ~90 min).
    body = {};
  }

  const division = parseDivision(body.division);
  const targetTimeMin = parseTargetTime(body.targetTimeMin);
  const replace =
    body.replace === true || req.nextUrl.searchParams.get("replace") === "true";

  try {
    await connectToDatabase();

    // Idempotency: a user keeps a single active HYROX plan. Re-seeding without
    // `replace` is rejected so a double-tap can't create 72 trainings.
    const existing = await TrainingModel.findOne({
      userId,
      discipline: "hyrox",
    })
      .select("planId")
      .lean();

    if (existing && !replace) {
      return Response.json(
        {
          detail: "HYROX plan already exists",
          code: "HYROX_PLAN_EXISTS",
          planId: existing.planId,
        },
        { status: 409 },
      );
    }

    if (existing && replace) {
      await TrainingModel.deleteMany({ userId, discipline: "hyrox" });
    }

    const plan = buildHyroxPlan({ division, targetTimeMin });
    const planId = `hyrox_${crypto.randomBytes(6).toString("hex")}`;

    const docs = plan.map((t) => ({
      userId,
      name: t.name,
      exercises: t.exercises,
      source: "generated",
      discipline: "hyrox",
      planId,
      weekIndex: t.weekIndex,
      dayIndex: t.dayIndex,
      phase: t.phase,
    }));

    const created = await TrainingModel.insertMany(docs);
    console.log(
      `[hyrox] inserted ${created.length} trainings userId=${userId} planId=${planId} division=${division}`,
    );

    return Response.json(
      {
        planId,
        created: created.length,
        weeks: HYROX_TOTAL_WEEKS,
        daysPerWeek: HYROX_DAYS_PER_WEEK,
        division,
        divisionLabel: DIVISION_LABELS[division],
        trainings: created,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("POST /api/hyrox/plan failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const token = bearerToken(req);
  const userId = token ? verifyToken(token)?.userId ?? null : null;
  if (!userId) {
    return Response.json({ detail: "Unauthorized" }, { status: 401 });
  }

  const planId = req.nextUrl.searchParams.get("planId");

  try {
    await connectToDatabase();
    // Always scope by userId so a guessed planId can't wipe another account.
    const filter: Record<string, unknown> = { userId, discipline: "hyrox" };
    if (planId) filter.planId = planId;
    const res = await TrainingModel.deleteMany(filter);
    return Response.json({ deleted: res.deletedCount ?? 0 }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/hyrox/plan failed:", err);
    return Response.json({ detail: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const division = parseDivision(req.nextUrl.searchParams.get("division"));
  const targetTimeMin = parseTargetTime(req.nextUrl.searchParams.get("targetTimeMin"));
  const plan = buildHyroxPlan({ division, targetTimeMin });
  return Response.json({
    weeks: HYROX_TOTAL_WEEKS,
    daysPerWeek: HYROX_DAYS_PER_WEEK,
    sessions: plan.length,
    division,
    divisionLabel: DIVISION_LABELS[division],
    divisions: Object.entries(DIVISION_LABELS).map(([value, label]) => ({ value, label })),
    plan,
  });
}
