import DashboardLayout from '@/components/Dashboard/DashboardLayout';

export default function HRDashboard() {
  return (
    <DashboardLayout role="hr" title="HR Dashboard">
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              HR Overview
            </h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Total Employees
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      95
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      New Hires (This Month)
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      8
                    </dd>
                  </dl>
                </div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Leave Requests
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      15
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