'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import Chat from '@/components/Chat';
import RatingForm from '@/components/RatingForm';

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  urgency: string;
  rewardPoints: number;
  createdAt: string;
  locationText?: string;
  imageUrl?: string;
  requester: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  acceptor?: {
    id: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  department: {
    name: string;
  };
  ratings?: Array<{
    giverId: string;
    receiverId: string;
  }>;
}

export default function TaskDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [task, setTask] = useState<Task | null>(null);
  const [loadingTask, setLoadingTask] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchTask();
    }
  }, [user, loading, router, params.id]);

  const fetchTask = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/tasks/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setTask(data);
      } else {
        router.push('/tasks');
      }
    } catch (error) {
      console.error('Failed to fetch task:', error);
      router.push('/tasks');
    } finally {
      setLoadingTask(false);
    }
  };

  const handleAccept = async () => {
    if (!task) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/tasks/${task.id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        await fetchTask();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to accept task');
      }
    } catch (error) {
      alert('Failed to accept task');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!task) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/tasks/${task.id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        await fetchTask();
        alert('Task completed! Points and reputation have been awarded.');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to complete task');
      }
    } catch (error) {
      alert('Failed to complete task');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!task) return;
    if (!confirm('Are you sure you want to cancel this task?')) return;

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/tasks/${task.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        router.push('/tasks');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to cancel task');
      }
    } catch (error) {
      alert('Failed to cancel task');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || loadingTask || !user || !task) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const isRequester = task.requester.id === user.id;
  const isAcceptor = task.acceptor?.id === user.id;
  const canAccept = task.status === 'OPEN' && !isRequester;
  const canComplete = task.status === 'ACCEPTED' && (isRequester || isAcceptor);
  const showChat = task.status === 'ACCEPTED' || task.status === 'COMPLETED';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Link href="/tasks" className="text-primary-600 hover:text-primary-500 mb-4 inline-block">
            ← Back to Tasks
          </Link>

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{task.title}</h1>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    task.urgency === 'HIGH' ? 'bg-red-100 text-red-800' :
                    task.urgency === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {task.urgency}
                  </span>
                  <span className="text-sm text-gray-500">{task.category}</span>
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm text-gray-500">{task.department.name}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary-600">{task.rewardPoints} pts</div>
                <div className="text-sm text-gray-500 mt-1">{task.status}</div>
              </div>
            </div>

            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
            </div>

            {task.locationText && (
              <div className="mb-4">
                <h2 className="text-lg font-semibold mb-2">Location</h2>
                <p className="text-gray-700">{task.locationText}</p>
              </div>
            )}

            {task.imageUrl && (
              <div className="mb-4">
                <img src={task.imageUrl} alt={task.title} className="max-w-full h-auto rounded-lg" />
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <div>
                <p className="text-sm text-gray-500">Posted by</p>
                <p className="font-medium">{task.requester.profile.firstName} {task.requester.profile.lastName}</p>
                {task.acceptor && (
                  <>
                    <p className="text-sm text-gray-500 mt-2">Accepted by</p>
                    <p className="font-medium">{task.acceptor.profile.firstName} {task.acceptor.profile.lastName}</p>
                  </>
                )}
              </div>

              <div className="flex space-x-3">
                {canAccept && (
                  <button
                    onClick={handleAccept}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    Accept Task
                  </button>
                )}
                {canComplete && (
                  <button
                    onClick={handleComplete}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    Mark Complete
                  </button>
                )}
                {(isRequester || isAcceptor) && task.status !== 'COMPLETED' && (
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {showChat && (
            <Chat taskId={task.id} requesterId={task.requester.id} acceptorId={task.acceptor?.id || ''} />
          )}

          {task.status === 'COMPLETED' && task.acceptor && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {isRequester && (!task.ratings || !task.ratings.some(r => r.giverId === user.id && r.receiverId === task.acceptor!.id)) && (
                <RatingForm
                  taskId={task.id}
                  receiverId={task.acceptor.id}
                  receiverName={`${task.acceptor.profile.firstName} ${task.acceptor.profile.lastName}`}
                  onRated={() => fetchTask()}
                />
              )}
              {isAcceptor && (!task.ratings || !task.ratings.some(r => r.giverId === user.id && r.receiverId === task.requester.id)) && (
                <RatingForm
                  taskId={task.id}
                  receiverId={task.requester.id}
                  receiverName={`${task.requester.profile.firstName} ${task.requester.profile.lastName}`}
                  onRated={() => fetchTask()}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
