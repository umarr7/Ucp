'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import { z } from 'zod';

interface Department {
  id: string;
  name: string;
  code: string;
}

// Define the validation schema matching the backend
const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title matches max length of 200'),
  description: z.string().min(1, 'Description is required').max(2000, 'Description matches max length of 2000'),
  category: z.enum(['ERRAND', 'LOST', 'BOOK', 'TUTORING', 'OTHER']),
  departmentId: z.string().min(1, 'Department is required'),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  rewardPoints: z.number().int().min(1, 'Points must be at least 1').max(100, 'Points cannot exceed 100'),
  locationText: z.string().optional(),
  imageUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
});

type TaskFormData = z.infer<typeof createTaskSchema>;

export default function NewTaskPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    category: 'ERRAND',
    departmentId: '',
    urgency: 'MEDIUM',
    rewardPoints: 15,
    locationText: '',
    imageUrl: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof TaskFormData, string>>>({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      if (user.level === 'NEW') {
        alert('You need to reach Bronze level to post tasks. Complete tasks to earn reputation!');
        router.push('/tasks');
        return;
      }
      fetchDepartments();
    }
  }, [user, loading, router]);

  useEffect(() => {
     if (user?.department?.id) {
         setFormData(prev => ({ ...prev, departmentId: user.department!.id }));
     }
  }, [user]);

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
        if (!formData.departmentId && data.length > 0 && !user?.department?.id) {
          setFormData(prev => ({ ...prev, departmentId: data[0].id }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const validateForm = (): boolean => {
    try {
      createTaskSchema.parse(formData);
      setFieldErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Partial<Record<keyof TaskFormData, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as keyof TaskFormData] = err.message;
          }
        });
        setFieldErrors(errors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    
    if (!validateForm()) {
        setGeneralError('Please fix the errors below.');
        return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      // Format data for API (clean up empty strings for optionals)
      const dataToSend = {
          ...formData,
          imageUrl: formData.imageUrl === '' ? undefined : formData.imageUrl,
          locationText: formData.locationText === '' ? undefined : formData.locationText
      };

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dataToSend),
      });

      if (res.ok) {
        const task = await res.json();
        router.push(`/tasks/${task.id}`);
      } else {
        const errorData = await res.json();
        if (errorData.details) {
            // Map server-side Zod errors if returned in expected format
            const errors: Partial<Record<keyof TaskFormData, string>> = {};
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
            errorData.details.forEach((err: any) => {
                 if (err.path[0]) {
                    errors[err.path[0] as keyof TaskFormData] = err.message;
                  }
            });
             setFieldErrors(errors);
             setGeneralError('Invalid input. Please check the fields.');
        } else {
            setGeneralError(errorData.error || 'Failed to create task');
        }
      }
    } catch (error) {
      setGeneralError('Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const inputClassName = (fieldName: keyof TaskFormData) => `
     mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-gray-900 
     ${fieldErrors[fieldName] ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
  `;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Task</h1>

          <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
            {generalError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {generalError}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  // removed required to test custom validation
                  maxLength={200}
                  className={inputClassName('title')}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
                 {fieldErrors.title && <p className="mt-1 text-sm text-red-600">{fieldErrors.title}</p>}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description *
                </label>
                <textarea
                  id="description"
                  // removed required
                  rows={6}
                  maxLength={2000}
                  className={inputClassName('description')}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                {fieldErrors.description && <p className="mt-1 text-sm text-red-600">{fieldErrors.description}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Category *
                  </label>
                  <select
                    id="category"
                    required
                    className={inputClassName('category')}
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  >
                    <option value="ERRAND">Errand</option>
                    <option value="LOST">Lost & Found</option>
                    <option value="BOOK">Book Exchange</option>
                    <option value="TUTORING">Tutoring</option>
                    <option value="OTHER">Other</option>
                  </select>
                   {fieldErrors.category && <p className="mt-1 text-sm text-red-600">{fieldErrors.category}</p>}
                </div>

                <div>
                  <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700">
                    Department *
                  </label>
                  <select
                    id="departmentId"
                    required
                    className={inputClassName('departmentId')}
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                   {fieldErrors.departmentId && <p className="mt-1 text-sm text-red-600">{fieldErrors.departmentId}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="urgency" className="block text-sm font-medium text-gray-700">
                    Urgency *
                  </label>
                  <select
                    id="urgency"
                    required
                    className={inputClassName('urgency')}
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value as any })}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                   {fieldErrors.urgency && <p className="mt-1 text-sm text-red-600">{fieldErrors.urgency}</p>}
                </div>

                <div>
                  <label htmlFor="rewardPoints" className="block text-sm font-medium text-gray-700">
                    Reward Points *
                  </label>
                  <input
                    type="number"
                    id="rewardPoints"
                    required
                    min={1}
                    max={100}
                    className={inputClassName('rewardPoints')}
                    value={formData.rewardPoints}
                    onChange={(e) => setFormData({ ...formData, rewardPoints: parseInt(e.target.value) || 0 })}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    You will pay 10 points to post this task
                  </p>
                   {fieldErrors.rewardPoints && <p className="mt-1 text-sm text-red-600">{fieldErrors.rewardPoints}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="locationText" className="block text-sm font-medium text-gray-700">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  id="locationText"
                  className={inputClassName('locationText')}
                  value={formData.locationText}
                  onChange={(e) => setFormData({ ...formData, locationText: e.target.value })}
                />
                 {fieldErrors.locationText && <p className="mt-1 text-sm text-red-600">{fieldErrors.locationText}</p>}
              </div>

              <div>
                <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">
                  Image URL (Optional)
                </label>
                <input
                  type="url"
                  id="imageUrl"
                  className={inputClassName('imageUrl')}
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                />
                 {fieldErrors.imageUrl && <p className="mt-1 text-sm text-red-600">{fieldErrors.imageUrl}</p>}
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
