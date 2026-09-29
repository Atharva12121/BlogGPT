import { TaxonomyManager } from "@/components/admin/taxonomy-manager";

export default function AdminTagsPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-semibold">Tags</h1><p className="text-muted-foreground">Manage searchable blog tags.</p></div>
      <TaxonomyManager kind="tags" title="Tags" />
    </div>
  );
}
