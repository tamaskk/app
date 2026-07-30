import { AuthGate } from "@/components/shell/AuthGate";
import { CreateTrainingScreen } from "@/components/exercises/CreateTrainingScreen";

export default function CreatePage() {
  return (
    <AuthGate>
      <CreateTrainingScreen />
    </AuthGate>
  );
}
