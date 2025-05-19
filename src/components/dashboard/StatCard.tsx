import { Link } from "wouter";

interface StatCardProps {
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  title: string;
  value: number;
  linkText: string;
  linkHref: string;
}

export default function StatCard({
  icon,
  iconBgColor,
  iconColor,
  title,
  value,
  linkText,
  linkHref,
}: StatCardProps) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${iconBgColor} rounded-md p-3`}>
            <div className={`h-6 w-6 ${iconColor}`}>{icon}</div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">
                  {value}
                </div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 px-5 py-3">
        <div className="text-sm">
          <Link href={linkHref}>
            <a className="font-medium text-primary-600 hover:text-primary-700">
              {linkText}
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
