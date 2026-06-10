import { AdminSidebar } from "@/components/AdminSidebar";

// Shared chrome for every authenticated admin page: persistent left sidebar,
// content area takes the remaining width. The middleware guarantees the user
// is already logged in by the time this layout renders.
export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-8 py-10">{children}</div>
      </main>
    </div>
  );
}
