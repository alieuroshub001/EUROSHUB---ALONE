'use client';

import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import ProjectMembers from '@/components/Projects/ProjectMembers';

export default function ClientProjectMembers() {
  const params = useParams();
  const projectId = params?.projectId as string;

  return (
    <DashboardLayout
      role="client"
      title="Project Members"
      showBreadcrumb={true}
      breadcrumbs={['Dashboard', 'Project Management', 'Projects', 'Project Members']}
    >
      <ProjectMembers
        projectId={projectId}
        userRole="client"
        baseUrl="/client"
      />
    </DashboardLayout>
  );
}