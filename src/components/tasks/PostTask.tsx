import { useState } from 'react';
import { Calendar, DollarSign, FileText, Tag, ChevronRight, ChevronLeft, Check, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTasks } from '../../hooks/useTasks';
import { supabase } from '../../lib/supabase';

interface PostTaskProps {
  onSuccess: () => void;
}

export function PostTask({ onSuccess }: PostTaskProps) {
  const { profile } = useAuth();
  const { createTask } = useTasks();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject: '',
    budget: '',
    deadline: '',
    visibility: 'public' as 'public' | 'unlisted',
    attachments: [] as File[],
  });
  const [error, setError] = useState('');

  const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology',
    'Computer Science', 'English', 'History', 'Economics',
    'Business Studies', 'Accounts', 'Psychology', 'Sociology'
  ];

  const steps = [
    { id: 1, title: 'The Basics', icon: FileText },
    { id: 2, title: 'Details', icon: Tag },
    { id: 3, title: 'Logistics', icon: DollarSign },
  ];

  const validateStep = (step: number) => {
    setError('');
    switch (step) {
      case 1:
        if (!formData.title.trim()) return 'Please enter a task title';
        if (!formData.subject) return 'Please select a subject';
        return null;
      case 2:
        if (!formData.description.trim()) return 'Please enter a description';
        return null;
      case 3:
        if (!formData.budget) return 'Please enter a budget';
        if (parseInt(formData.budget) < 10) return 'Minimum budget is ₹10';
        if (!formData.deadline) return 'Please set a deadline';
        if (new Date(formData.deadline) <= new Date()) return 'Deadline must be in the future';
        return null;
      default:
        return null;
    }
  };

  const handleNext = () => {
    const validationError = validateStep(currentStep);
    if (validationError) {
      setError(validationError);
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setError('');
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const validationError = validateStep(3);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const { attachments, ...taskData } = formData;
      const { data: task, error: taskError } = await createTask({
        ...taskData,
        budget: parseInt(formData.budget),
        owner_id: profile.id,
      });

      if (taskError) throw taskError;

      if (task && formData.attachments.length > 0) {
        // Upload attachments
        const uploadPromises = formData.attachments.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${task.id}/${Math.random()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('task_attachments')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('task_attachments')
            .getPublicUrl(fileName);

          return supabase.from('task_attachments').insert({
            task_id: task.id,
            file_url: publicUrl,
            file_type: file.type,
            file_name: file.name,
            file_size: file.size
          });
        });

        await Promise.all(uploadPromises);
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        subject: '',
        budget: '',
        deadline: '',
        visibility: 'public',
        attachments: [],
      });
      setCurrentStep(1);
      onSuccess();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const minDeadline = new Date();
  minDeadline.setHours(minDeadline.getHours() + 1);

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">

        {/* Progress Header */}
        <div className="bg-gray-50 dark:bg-gray-900/50 p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Post a New Task</h1>

          <div className="flex justify-between relative max-w-sm mx-auto">
            {/* Progress Line */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 -translate-y-1/2 z-0 rounded-full"></div>
            <div
              className="absolute top-1/2 left-0 h-1 bg-blue-600 -translate-y-1/2 z-0 rounded-full transition-all duration-500"
              style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
            ></div>

            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;

              return (
                <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isActive
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-110'
                      : isCompleted
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400'
                      }`}
                  >
                    {isCompleted ? <Check size={20} /> : <Icon size={20} />}
                  </div>
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'
                    }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center animate-fade-in-down">
              <X size={18} className="mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={(e) => e.preventDefault()} className="min-h-[300px]">
            {/* Step 1: The Basics */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fade-in-right">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    What starts your task?
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="input w-full pl-4 pr-12 py-4 text-lg font-medium"
                      placeholder="e.g., Biochemistry Lab Report Help"
                      maxLength={80}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {formData.title.length}/80
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select a Subject
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {subjects.map((subject) => (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, subject }))}
                        className={`px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all ${formData.subject === subject
                          ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300 dark:ring-blue-900'
                          : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Details */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fade-in-right">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Describe requirements in detail
                  </label>
                  <textarea
                    autoFocus
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="input w-full p-4 min-h-[200px]"
                    placeholder="Include word count, format, specific topics to cover, and grading criteria..."
                    maxLength={2000}
                  />
                  <div className="text-right mt-2 text-xs text-gray-500">
                    {formData.description.length}/2000 characters
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl">
                  <span className="text-sm font-semibold text-blue-800 dark:text-blue-300 block mb-2">Visibility</span>
                  <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        value="public"
                        checked={formData.visibility === 'public'}
                        onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value as any }))}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-800 dark:text-gray-200">Public (Everyone)</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        value="unlisted"
                        checked={formData.visibility === 'unlisted'}
                        onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value as any }))}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-800 dark:text-gray-200">Unlisted (Link only)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reference Images (Optional)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center hover:border-blue-500 transition-colors bg-gray-50 dark:bg-gray-800/50">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files) {
                          setFormData(prev => ({
                            ...prev,
                            attachments: [...prev.attachments, ...Array.from(e.target.files || [])]
                          }));
                        }
                      }}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-3">
                        <Tag size={24} />
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Click to upload images
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        PNG, JPG up to 5MB
                      </span>
                    </label>
                  </div>

                  {/* Preview Attachments */}
                  {formData.attachments.length > 0 && (
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                      {formData.attachments.map((file, index) => (
                        <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 group">
                          <img
                            src={URL.createObjectURL(file)}
                            alt="preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => setFormData(prev => ({
                              ...prev,
                              attachments: prev.attachments.filter((_, i) => i !== index)
                            }))}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Logistics */}
            {currentStep === 3 && (
              <div className="space-y-8 animate-fade-in-right">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Your Budget (₹)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="number"
                        autoFocus
                        value={formData.budget}
                        onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                        className="input w-full pl-12 py-4 text-2xl font-bold"
                        placeholder="500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Suggested: ₹200 - ₹5000 based on complexity
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Calendar size={16} className="inline mr-2" />
                      Deadline
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.deadline}
                      min={minDeadline.toISOString().slice(0, 16)}
                      onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                      className="input w-full py-4 text-lg"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Review your details above.
                  </p>
                  <p className="text-xs text-gray-500">
                    By posting, you agree to fair payment upon task completion.
                  </p>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer Navigation */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
          <button
            onClick={handleBack}
            disabled={currentStep === 1 || loading}
            className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all ${currentStep === 1
              ? 'opacity-0 pointer-events-none'
              : 'text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
          >
            <ChevronLeft size={20} className="mr-2" />
            Back
          </button>

          {currentStep < 3 ? (
            <button
              onClick={handleNext}
              className="btn-primary px-8 py-3 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              Next Step
              <ChevronRight size={20} className="ml-2" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-green-500/30 hover:scale-105 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  Post Task
                  <Check size={20} className="ml-2" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}