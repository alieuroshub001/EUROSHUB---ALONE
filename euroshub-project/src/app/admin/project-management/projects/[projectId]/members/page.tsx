'use client';

import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import ProjectMembers from '@/components/Projects/ProjectMembers';

export default function AdminProjectMembers() {
  const params = useParams();
  const projectId = params?.projectId as string;

  return (
    <DashboardLayout
      role="admin"
      title="Project Members"
      showBreadcrumb={true}
      breadcrumbs={['Dashboard', 'Project Management', 'Projects', 'Project Members']}
    >
      <ProjectMembers
        projectId={projectId}
        userRole="admin"
        baseUrl="/admin"
      />
    </DashboardLayout>
  );
}