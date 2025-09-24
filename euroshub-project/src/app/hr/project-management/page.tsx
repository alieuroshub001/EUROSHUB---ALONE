import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import ProjectManagement from '@/components/Projects/ProjectManagement';

export default function HRProjectManagement() {
  return (
    <DashboardLayout
      role="hr"
      title="Project Management"
      showBreadcrumb={true}
      breadcrumbs={['Dashboard', 'Project Management']}
    >
      <ProjectManagement userRole="hr" baseUrl="/hr" />
    </DashboardLayout>
  );
}