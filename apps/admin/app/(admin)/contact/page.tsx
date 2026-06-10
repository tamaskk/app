import { connectToDatabase } from "@/lib/mongodb";
import { ContactMessageModel } from "@/lib/models/ContactMessage";
import { ContactTable } from "@/components/ContactTable";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  await connectToDatabase();

  const messages = await ContactMessageModel.find({})
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  const rows = messages.map((m) => ({
    id: String(m._id),
    name: m.name as string,
    email: m.email as string,
    subject: (m.subject as string) || "(no subject)",
    message: m.message as string,
    status: (m.status as string) || "new",
    createdAt: new Date(m.createdAt as Date).toLocaleString(),
  }));

  return (
    <div>
      <header className="mb-8">
        <p className="text-[10px] font-extrabold tracking-widest text-white/45">
          INBOX
        </p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">
          Contact
        </h1>
        <p className="mt-2 text-[13px] text-white/55">
          {messages.length} messages. Newest first.
        </p>
      </header>
      <ContactTable rows={rows} />
    </div>
  );
}
