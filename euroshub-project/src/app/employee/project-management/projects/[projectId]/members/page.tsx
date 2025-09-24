'use client';

import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import ProjectMembers from '@/components/Projects/ProjectMembers';

export default function EmployeeProjectMembers() {
  const params = useParams();
  const projectId = params?.projectId as string;

  return (
    <DashboardLayout
      role="employee"
      title="Project Members"
      showBreadcrumb={true}
      breadcrumbs={['Dashboard', 'Project Management', 'Projects', 'Project Members']}
    >
      <ProjectMembers
        projectId={projectId}
        userRole="employee"
        baseUrl="/employee"
      />
    </DashboardLayout>
  );
}