import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import CreateProject from '@/components/Projects/CreateProject';

export default function HRCreateProject() {
  return (
    <DashboardLayout
      role="hr"
      title="Create Project"
      showBreadcrumb={true}
      breadcrumbs={['Dashboard', 'Project Management', 'Create Project']}
    >
      <CreateProject userRole="hr" baseUrl="/hr" />
    </DashboardLayout>
  );
}