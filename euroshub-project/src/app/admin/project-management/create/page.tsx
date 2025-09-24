import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import CreateProject from '@/components/Projects/CreateProject';

export default function AdminCreateProject() {
  return (
    <DashboardLayout
      role="admin"
      title="Create Project"
      showBreadcrumb={true}
      breadcrumbs={['Dashboard', 'Project Management', 'Create Project']}
    >
      <CreateProject userRole="admin" baseUrl="/admin" />
    </DashboardLayout>
  );
}