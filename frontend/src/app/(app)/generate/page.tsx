import { loadGenerateCatalog } from "@/lib/actions/workspace";
import { GenerateWizard } from "@/components/generate/generate-wizard";

export default async function GeneratePage() {
  const catalog = await loadGenerateCatalog();
  return <GenerateWizard catalog={catalog} />;
}
