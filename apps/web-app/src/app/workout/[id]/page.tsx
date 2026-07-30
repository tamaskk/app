import { AuthGate } from "@/components/shell/AuthGate";
import { WorkoutScreen } from "@/components/workout/WorkoutScreen";

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <AuthGate>
      <WorkoutScreen trainingId={id} />
    </AuthGate>
  );
}
