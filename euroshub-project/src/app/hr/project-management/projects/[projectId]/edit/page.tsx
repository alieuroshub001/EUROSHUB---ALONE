'use client';

import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import EditProject from '@/components/Projects/EditProject';

export default function HREditProject() {
  const params = useParams();
  const projectId = params?.projectId as string;

  return (
    <DashboardLayout
      role="hr"
      title="Edit Project"
      showBreadcrumb={true}
      breadcrumbs={['Dashboard', 'Project Management', 'Projects', 'Edit Project']}
    >
      <EditProject
        projectId={projectId}
        userRole="hr"
        baseUrl="/hr"
      />
    </DashboardLayout>
  );
}