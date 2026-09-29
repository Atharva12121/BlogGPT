import { TaxonomyManager } from "@/components/admin/taxonomy-manager";

export default function AdminCategoriesPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-semibold">Categories</h1><p className="text-muted-foreground">Organize published content.</p></div>
      <TaxonomyManager kind="categories" title="Categories" />
    </div>
  );
}
