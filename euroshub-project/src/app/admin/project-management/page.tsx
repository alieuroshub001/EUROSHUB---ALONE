import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import ProjectManagement from '@/components/Projects/ProjectManagement';

export default function AdminProjectManagement() {
  return (
    <DashboardLayout
      role="admin"
      title="Project Management"
      showBreadcrumb={true}
      breadcrumbs={['Dashboard', 'Project Management']}
    >
      <ProjectManagement userRole="admin" baseUrl="/admin" />
    </DashboardLayout>
  );
}