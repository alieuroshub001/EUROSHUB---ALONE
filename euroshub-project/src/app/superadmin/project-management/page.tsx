import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import ProjectManagement from '@/components/Projects/ProjectManagement';

export default function SuperAdminProjectManagement() {
  return (
    <DashboardLayout
      role="superadmin"
      title="Project Management"
      showBreadcrumb={true}
      breadcrumbs={['Dashboard', 'Project Management']}
    >
      <ProjectManagement userRole="superadmin" baseUrl="/superadmin" />
    </DashboardLayout>
  );
}