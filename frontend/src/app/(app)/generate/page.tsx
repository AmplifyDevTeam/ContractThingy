import { loadGenerateCatalog } from "@/lib/actions/workspace";
import { GenerateWizard } from "@/components/generate/generate-wizard";
import { requirePermission } from "@/lib/auth/session";

export default async function GeneratePage() {
  await requirePermission("documents.create");
  const catalog = await loadGenerateCatalog();
  return <GenerateWizard catalog={catalog} />;
}
