'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  urgency: string;
  rewardPoints: number;
  createdAt: string;
  requester: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  department: {
    name: string;
  };
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [acceptedTasks, setAcceptedTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchTasks();
    }
  }, [user, loading, router]);

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const [myRes, acceptedRes] = await Promise.all([
        fetch('/api/tasks?myTasks=true', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/tasks?acceptedByMe=true', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (myRes.ok) {
        const data = await myRes.json();
        setMyTasks(data.filter((t: Task) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED'));
      }

      if (acceptedRes.ok) {
        const data = await acceptedRes.json();
        setAcceptedTasks(data.filter((t: Task) => t.status === 'ACCEPTED'));
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ELITE': return 'text-purple-600';
      case 'GOLD': return 'text-yellow-600';
      case 'SILVER': return 'text-gray-600';
      case 'BRONZE': return 'text-orange-600';
      default: return 'text-gray-400';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'HIGH': return 'bg-red-100 text-red-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">Welcome back, {user.profile?.firstName}!</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">💰</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Points</dt>
                      <dd className="text-lg font-medium text-gray-900">{user.points}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">⭐</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Reputation</dt>
                      <dd className="text-lg font-medium text-gray-900">{user.reputation}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">🏆</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Level</dt>
                      <dd className={`text-lg font-medium ${getLevelColor(user.level)}`}>
                        {user.level}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">📋</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Tasks</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {acceptedTasks.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  My Posted Tasks
                </h3>
                {loadingTasks ? (
                  <div className="text-center py-4">Loading...</div>
                ) : myTasks.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No active tasks. <Link href="/tasks/new" className="text-primary-600 hover:text-primary-500">Post one now</Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myTasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="border-b border-gray-200 pb-4 last:border-0">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <Link href={`/tasks/${task.id}`} className="font-medium text-gray-900 hover:text-primary-600">
                              {task.title}
                            </Link>
                            <p className="text-sm text-gray-500 mt-1">{task.description.substring(0, 100)}...</p>
                            <div className="mt-2 flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(task.urgency)}`}>
                                {task.urgency}
                              </span>
                              <span className="text-sm text-gray-500">{task.rewardPoints} pts</span>
                            </div>
                          </div>
                          <span className="ml-4 text-sm text-gray-500">{task.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Accepted Tasks
                </h3>
                {loadingTasks ? (
                  <div className="text-center py-4">Loading...</div>
                ) : acceptedTasks.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No accepted tasks. <Link href="/tasks" className="text-primary-600 hover:text-primary-500">Browse tasks</Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {acceptedTasks.map((task) => (
                      <div key={task.id} className="border-b border-gray-200 pb-4 last:border-0">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <Link href={`/tasks/${task.id}`} className="font-medium text-gray-900 hover:text-primary-600">
                              {task.title}
                            </Link>
                            <p className="text-sm text-gray-500 mt-1">{task.description.substring(0, 100)}...</p>
                            <div className="mt-2 flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(task.urgency)}`}>
                                {task.urgency}
                              </span>
                              <span className="text-sm text-gray-500">{task.rewardPoints} pts</span>
                            </div>
                          </div>
                          <Link
                            href={`/tasks/${task.id}`}
                            className="ml-4 inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-primary-700 bg-primary-100 hover:bg-primary-200"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
