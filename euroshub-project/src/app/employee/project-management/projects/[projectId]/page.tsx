'use client';

import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import ProjectDetail from '@/components/Projects/ProjectDetail';

export default function EmployeeProjectDetail() {
  const params = useParams();
  const projectId = params?.projectId as string;

  return (
    <DashboardLayout
      role="employee"
      title="Project Details"
      showBreadcrumb={true}
      breadcrumbs={['Dashboard', 'Project Management', 'Project Details']}
    >
      <ProjectDetail
        projectId={projectId}
        userRole="employee"
        baseUrl="/employee"
      />
    </DashboardLayout>
  );
}