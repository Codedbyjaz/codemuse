import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { SystemStatus as SystemStatusType } from "@/lib/types";
import { CheckCircle, Clock, Lock, Fingerprint } from "lucide-react";

export default function SystemStatus() {
  const { data: status, isLoading, error } = useQuery<SystemStatusType>({
    queryKey: ['/api/status'],
  });

  if (isLoading) {
    return (
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">System Status</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg p-5">
            <div className="animate-pulse h-28 bg-gray-200 rounded"></div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg p-5">
            <div className="animate-pulse h-28 bg-gray-200 rounded"></div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg p-5">
            <div className="animate-pulse h-28 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">System Status</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-4">
          <div className="text-red-500">
            Error loading system status: {(error as Error).message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 mb-4">System Status</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Locks Status Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <Lock className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Locked Files
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {status?.locks || 0}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  config/settings.json
                </span>
                <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  main.py (pattern: delete_user)
                </span>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/locks">
                <a className="font-medium text-primary-600 hover:text-primary-700">
                  Manage locks
                </a>
              </Link>
            </div>
          </div>
        </div>

        {/* Rate Limiting Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Rate Limiting
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      Active
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm flex justify-between">
                <span>Limits/minute:</span>
                <span className="font-medium">10</span>
              </div>
              <div className="text-sm flex justify-between mt-1">
                <span>Abuse alerts today:</span>
                <span className="font-medium text-yellow-600">3</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/logs">
                <a className="font-medium text-primary-600 hover:text-primary-700">
                  View logs
                </a>
              </Link>
            </div>
          </div>
        </div>

        {/* Fingerprinting Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                <Fingerprint className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Fingerprinting
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      Active
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm flex justify-between">
                <span>Last hash update:</span>
                <span className="font-medium">10 min ago</span>
              </div>
              <div className="text-sm flex justify-between mt-1">
                <span>Total tracked files:</span>
                <span className="font-medium">42</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link href="/configuration">
                <a className="font-medium text-primary-600 hover:text-primary-700">
                  View details
                </a>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
