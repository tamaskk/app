import { redirect } from "next/navigation";

// Bare root — anyone hitting `/` gets bounced to the dashboard, which the
// middleware will then redirect to /login when no session cookie is set.
export default function Index() {
  redirect("/dashboard");
}
