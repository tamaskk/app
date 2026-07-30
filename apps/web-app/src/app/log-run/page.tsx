import { AuthGate } from "@/components/shell/AuthGate";
import { LogRunScreen } from "@/components/run/LogRunScreen";

export default function LogRunPage() {
  return (
    <AuthGate>
      <LogRunScreen />
    </AuthGate>
  );
}
