import DashboardLayout from '@/components/Dashboard/DashboardLayout';

export default function AdminDashboard() {
  return (
    <DashboardLayout role="admin" title="Admin Dashboard">
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Admin Overview
            </h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Department Users
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      38
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Active Projects
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      12
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Pending Tasks
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      24
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}