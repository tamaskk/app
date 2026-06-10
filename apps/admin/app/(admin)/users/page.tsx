import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/lib/models/User";
import { rankForXp } from "@/lib/rank";
import { UsersTable } from "@/components/UsersTable";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await connectToDatabase();

  const users = await UserModel.find({})
    .sort({ createdAt: -1 })
    .limit(500)
    .select("email name username xp rank country createdAt")
    .lean();

  const rows = users.map((u) => ({
    id: String(u._id),
    email: u.email as string,
    name: (u.name as string) || "",
    username: (u.username as string | null) ?? null,
    xp: (u.xp as number) ?? 0,
    rank: (u.rank as number) ?? rankForXp((u.xp as number) ?? 0).tier,
    rankName: rankForXp((u.xp as number) ?? 0).name,
    country: (u.country as string | null) ?? null,
    // Pre-format on the server so the client component renders the exact
    // same string. toLocaleDateString() drifts between Node and the browser
    // (different default locales) and that mismatch breaks hydration.
    createdAt: formatDate(u.createdAt as Date),
  }));

  return (
    <div>
      <header className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-extrabold tracking-widest text-white/45">
            DIRECTORY
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">
            Users
          </h1>
          <p className="mt-2 text-[13px] text-white/55">
            {users.length} accounts (showing newest first, capped at 500).
          </p>
        </div>
      </header>
      <UsersTable rows={rows} />
    </div>
  );
}

// Fixed locale + format so server / client renders are byte-identical.
function formatDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
