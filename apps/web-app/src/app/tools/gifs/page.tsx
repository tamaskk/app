import { AuthGate } from "@/components/shell/AuthGate";
import { DownloadGifsScreen } from "@/components/tools/DownloadGifsScreen";

export default function GifsToolPage() {
  return (
    <AuthGate>
      <DownloadGifsScreen />
    </AuthGate>
  );
}
