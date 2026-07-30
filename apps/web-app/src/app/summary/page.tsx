import { AuthGate } from "@/components/shell/AuthGate";
import { SummaryScreen } from "@/components/workout/SummaryScreen";

export default function SummaryPage() {
  return (
    <AuthGate>
      <SummaryScreen />
    </AuthGate>
  );
}
