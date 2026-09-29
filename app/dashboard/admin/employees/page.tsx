import { EmployeeManagement } from "@/components/admin/employee-management";

export default function AdminEmployeesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Employees</h1>
        <p className="text-muted-foreground">Create, update, and remove employee accounts.</p>
      </div>
      <EmployeeManagement />
    </div>
  );
}
