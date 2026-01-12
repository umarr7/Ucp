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
  const [error, setError] = useState<string | null>(null);
  const [showChatHint, setShowChatHint] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user && params.id) {
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
        setError(null);
        // If the task is already accepted and the current user is part of it, show chat hint
        if (
          (data.status === 'ACCEPTED' || data.status === 'COMPLETED') &&
          user &&
          (data.requester.id === user.id || data.acceptor?.id === user.id)
        ) {
          setShowChatHint(true);
        } else {
          setShowChatHint(false);
        }
      } else if (res.status === 401) {
        router.push('/login');
      } else if (res.status === 403) {
        setError('You do not have access to view this task.');
      } else {
        setError('Task not found');
      }
    } catch (error) {
      console.error('Failed to fetch task:', error);
      setError('Connection error. Please try again.');
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
        setShowChatHint(true);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to accept task');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to accept task. Check console for details.');
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

  if (loading || loadingTask) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !task) {
      return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h3 className="text-xl font-medium text-gray-900">Task Not Found</h3>
                    <p className="mt-2 text-gray-500">{error || 'This task may have been removed or does not exist.'}</p>
                    <Link href="/tasks" className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700">
                        Back to Tasks
                    </Link>
                </div>
            </div>
        </div>
      );
  }

  const isRequester = user && task.requester.id === user.id;
  const isAcceptor = user && task.acceptor?.id === user.id;
  const canAccept = task.status === 'OPEN' && !isRequester;
  const canComplete = task.status === 'ACCEPTED' && (isRequester || isAcceptor);
  const showChat = (task.status === 'ACCEPTED' || task.status === 'COMPLETED') && (isRequester || isAcceptor);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Link href="/tasks" className="text-primary-600 hover:text-primary-500 mb-4 inline-block">
            ← Back to Tasks
          </Link>

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{task.title}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    task.urgency === 'HIGH' ? 'bg-red-100 text-red-800' :
                    task.urgency === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {task.urgency}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {task.category}
                  </span>
                   <span className="text-sm text-gray-500">{task.department.name}</span>
                </div>
              </div>
              <div className="text-right mt-4 md:mt-0">
                <div className="text-2xl font-bold text-primary-600">{task.rewardPoints} pts</div>
                <div className="text-sm font-medium text-gray-500 mt-1 uppercase tracking-wider">{task.status}</div>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
            </div>

            {(task.locationText || task.imageUrl) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {task.locationText && (
                  <div>
                    <h2 className="text-lg font-semibold mb-2">Location</h2>
                    <p className="text-gray-700">{task.locationText}</p>
                  </div>
                )}
                 {task.imageUrl && (
                  <div>
                     <h2 className="text-lg font-semibold mb-2">Image</h2>
                    <img src={task.imageUrl} alt={task.title} className="max-w-full h-auto rounded-lg" />
                  </div>
                )}
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between border-t border-gray-200">
              <div className="mb-4 md:mb-0">
                <p className="text-sm text-gray-500">Posted by</p>
                <p className="font-medium text-gray-900">{task.requester.profile.firstName} {task.requester.profile.lastName}</p>
                {isRequester && <span className="text-xs text-primary-600 font-medium">(You)</span>}
              </div>

              {task.acceptor && (
                 <div className="mb-4 md:mb-0 md:ml-6">
                    <p className="text-sm text-gray-500">Accepted by</p>
                    <p className="font-medium text-gray-900">{task.acceptor.profile.firstName} {task.acceptor.profile.lastName}</p>
                     {isAcceptor && <span className="text-xs text-primary-600 font-medium">(You)</span>}
                </div>
              )}

              <div className="flex flex-wrap gap-3 mt-2 md:mt-0">
                {canAccept && (
                  <button
                    onClick={handleAccept}
                    disabled={actionLoading}
                    className="px-6 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    Accept Task
                  </button>
                )}
                
                {canComplete && (
                  <button
                    onClick={handleComplete}
                    disabled={actionLoading}
                    className="px-6 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    Mark Complete
                  </button>
                )}
                {(isRequester || isAcceptor) && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="px-6 py-2 bg-white border border-red-300 text-red-700 font-medium rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    Cancel Task
                  </button>
                )}
              </div>
            </div>
          </div>

          {showChat && (
            <div className="mt-8">
                 <h2 className="text-xl font-bold text-gray-900 mb-4">Task Chat</h2>
                 {showChatHint && (
                   <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                      <div className="flex">
                          <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                          </div>
                          <div className="ml-3">
                              <p className="text-sm text-blue-700">
                                  You can now chat with {isRequester ? task.acceptor?.profile.firstName : task.requester.profile.firstName} to coordinate this task.
                              </p>
                          </div>
                      </div>
                  </div>
                 )}
                <Chat taskId={task.id} requesterId={task.requester.id} acceptorId={task.acceptor?.id || ''} />
            </div>
          )}

          {task.status === 'COMPLETED' && task.acceptor && (
            <div className="mt-8">
               <h2 className="text-xl font-bold text-gray-900 mb-4">Ratings</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isRequester && (!task.ratings || !task.ratings.some(r => r.giverId === user?.id && r.receiverId === task.acceptor!.id)) && (
                    <RatingForm
                    taskId={task.id}
                    receiverId={task.acceptor.id}
                    receiverName={`${task.acceptor.profile.firstName} ${task.acceptor.profile.lastName}`}
                    onRated={() => fetchTask()}
                    />
                )}
                {isAcceptor && (!task.ratings || !task.ratings.some(r => r.giverId === user?.id && r.receiverId === task.requester.id)) && (
                    <RatingForm
                    taskId={task.id}
                    receiverId={task.requester.id}
                    receiverName={`${task.requester.profile.firstName} ${task.requester.profile.lastName}`}
                    onRated={() => fetchTask()}
                    />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
