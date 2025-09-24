import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import ProjectManagement from '@/components/Projects/ProjectManagement';

export default function EmployeeProjectManagement() {
  return (
    <DashboardLayout
      role="employee"
      title="Project Management"
      showBreadcrumb={true}
      breadcrumbs={['Dashboard', 'Project Management']}
    >
      <ProjectManagement userRole="employee" baseUrl="/employee" />
    </DashboardLayout>
  );
}