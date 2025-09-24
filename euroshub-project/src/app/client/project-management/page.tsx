import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import ProjectManagement from '@/components/Projects/ProjectManagement';

export default function ClientProjectManagement() {
  return (
    <DashboardLayout
      role="client"
      title="Project Management"
      showBreadcrumb={true}
      breadcrumbs={['Dashboard', 'Project Management']}
    >
      <ProjectManagement userRole="client" baseUrl="/client" />
    </DashboardLayout>
  );
}