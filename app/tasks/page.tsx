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
    code: string;
  };
  isFeatured: boolean;
  isBoosted: boolean;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

type TabType = 'feed' | 'active' | 'my-posts';

export default function TasksPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [loadingTasks, setLoadingTasks] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchDepartments();
      fetchTasks();
    }
  }, [user, loading, router, selectedDepartment, selectedCategory, activeTab]);

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (selectedDepartment) params.append('departmentId', selectedDepartment);
      if (selectedCategory) params.append('category', selectedCategory);

      // Tab specific filters
      if (activeTab === 'feed') {
        params.append('status', 'OPEN');
      } else if (activeTab === 'active') {
        params.append('acceptedByMe', 'true');
        // We want to see accepted tasks, and maybe completed ones too that we accepted
        // The API defaults status to OPEN/ACCEPTED if not specified, but for active tasks we definitely want ACCEPTED
        // If we want COMPLETED too, we might need to adjust API or just rely on 'acceptedByMe' if back end handles it.
        // Let's explicitly look for ACCEPTED tasks for now as "Active".
        // If the user wants history, that might be another tab. 
        // For "Active", ACCEPTED is the key status.
        // CHECK API: route.ts line 44: if status not provided, it fetches OPEN and ACCEPTED.
        // But if acceptedByMe is true, we probably want all tasks I'm working on.
        // Let's NOT set status param here so it defaults to OPEN/ACCEPTED, 
        // effectively showing any task I'm involved in that isn't cancelled/archived?
        // Actually, for "Active Tasks", we usually mean tasks IN PROGRESS. 
        // So status=ACCEPTED makes the most sense.
        params.append('status', 'ACCEPTED');
      } else if (activeTab === 'my-posts') {
        params.append('myTasks', 'true');
        // detailed logic: show all my posts regardless of status? usually yes.
        // API defaults to OPEN, ACCEPTED. 
        // If I want to see my COMPLETED posts too, I might need to override status parameter in API or pass 'status=' empty to get all?
        // The API code at line 41 says: if (status) where.status = status; else where.status = { in: ['OPEN', 'ACCEPTED'] };
        // So currently it won't show COMPLETED tasks.
        // For now, let's just stick to the default behavior which shows active/open stuff.
      }

      const res = await fetch(`/api/tasks?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setTasks(data);
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

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'HIGH': return 'bg-red-100 text-red-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'ERRAND': return 'bg-blue-100 text-blue-800';
      case 'LOST': return 'bg-purple-100 text-purple-800';
      case 'BOOK': return 'bg-green-100 text-green-800';
      case 'TUTORING': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <h1 className="text-3xl font-bold text-gray-900">Task Feed</h1>
            <Link
              href="/tasks/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
            >
              + New Task
            </Link>
          </div>

          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('feed')}
                className={`${
                  activeTab === 'feed'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Available Tasks
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className={`${
                  activeTab === 'active'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Active Tasks
              </button>
              <button
                onClick={() => setActiveTab('my-posts')}
                className={`${
                  activeTab === 'my-posts'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                My Posts
              </button>
            </nav>
          </div>

          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">All Categories</option>
                  <option value="ERRAND">Errand</option>
                  <option value="LOST">Lost & Found</option>
                  <option value="BOOK">Book Exchange</option>
                  <option value="TUTORING">Tutoring</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSelectedDepartment('');
                    setSelectedCategory('');
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Task List */}
          {loadingTasks ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <p className="text-gray-500">
                {activeTab === 'feed'
                  ? 'No available tasks found.'
                  : activeTab === 'active'
                  ? 'You haven\'t accepted any tasks yet.'
                  : 'You haven\'t posted any tasks yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {task.isFeatured && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            ⭐ Featured
                          </span>
                        )}
                        {task.isBoosted && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            🚀 Boosted
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(task.urgency)}`}>
                          {task.urgency}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(task.category)}`}>
                          {task.category}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{task.title}</h3>
                      <p className="text-gray-600 mb-4">{task.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>By {task.requester.profile.firstName} {task.requester.profile.lastName}</span>
                        <span>•</span>
                        <span>{task.department.name}</span>
                        <span>•</span>
                        <span className="font-medium text-primary-600">{task.rewardPoints} points</span>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-sm text-gray-500">
                        {new Date(task.createdAt).toLocaleDateString()}
                      </div>
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          task.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
