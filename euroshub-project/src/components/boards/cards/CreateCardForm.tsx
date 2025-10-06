'use client';

import { useState } from 'react';
import { X, Plus, Trash2, ArrowRight, Users } from 'lucide-react';

interface CreateCardFormProps {
  listId: string;
  boardMembers?: BoardMember[];
  onCreateCard: (listId: string, cardData: CreateCardData) => Promise<void>;
  onCancel: () => void;
}

interface BoardMember {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  role: string;
}

interface WorkflowStage {
  order: number;
  name: string;
  assignedTo: string; // User ID
  tasks: { title: string; description?: string }[];
}

export interface CreateCardData {
  title: string;
  description?: string;
  coverImage?: string;
  color?: string;
  labels?: string[];
  dueDate?: Date;
  assignedMembers?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  // NEW: Workflow fields
  workflowEnabled?: boolean;
  workflowStages?: WorkflowStage[];
  autoProgressEnabled?: boolean;
}

const CreateCardForm: React.FC<CreateCardFormProps> = ({
  listId,
  boardMembers = [],
  onCreateCard,
  onCancel,
}) => {
  const [cardData, setCardData] = useState<CreateCardData>({
    title: '',
    description: '',
    labels: [],
    assignedMembers: [],
    priority: 'medium',
    workflowEnabled: false,
    workflowStages: [],
    autoProgressEnabled: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cardData.title.trim()) return;

    setIsLoading(true);
    try {
      await onCreateCard(listId, {
        ...cardData,
        title: cardData.title.trim(),
        description: cardData.description?.trim() || undefined
      });

      // Reset form
      setCardData({
        title: '',
        description: '',
        labels: [],
        assignedMembers: [],
        priority: 'medium'
      });
      setShowAdvanced(false);
    } catch (error) {
      console.error('Error creating card:', error);
      // TODO: Show error message to user
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setCardData({
      title: '',
      description: '',
      labels: [],
      assignedMembers: [],
      priority: 'medium'
    });
    setShowAdvanced(false);
    onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const addLabel = (label: string) => {
    if (label.trim() && !cardData.labels?.includes(label.trim())) {
      setCardData(prev => ({
        ...prev,
        labels: [...(prev.labels || []), label.trim()]
      }));
    }
  };

  const removeLabel = (labelToRemove: string) => {
    setCardData(prev => ({
      ...prev,
      labels: prev.labels?.filter(label => label !== labelToRemove) || []
    }));
  };

  const predefinedLabels = ['Frontend', 'Backend', 'Design', 'Bug', 'Feature', 'Urgent', 'Testing'];

  // Workflow functions
  const addWorkflowStage = () => {
    const newStage: WorkflowStage = {
      order: cardData.workflowStages?.length || 0,
      name: `Stage ${(cardData.workflowStages?.length || 0) + 1}`,
      assignedTo: '',
      tasks: []
    };

    setCardData(prev => ({
      ...prev,
      workflowEnabled: true,
      workflowStages: [...(prev.workflowStages || []), newStage]
    }));
  };

  const removeWorkflowStage = (index: number) => {
    setCardData(prev => ({
      ...prev,
      workflowStages: prev.workflowStages?.filter((_, i) => i !== index).map((stage, i) => ({
        ...stage,
        order: i
      }))
    }));
  };

  const updateWorkflowStage = (index: number, field: keyof WorkflowStage, value: string) => {
    setCardData(prev => ({
      ...prev,
      workflowStages: prev.workflowStages?.map((stage, i) =>
        i === index ? { ...stage, [field]: value } : stage
      )
    }));
  };

  const addTaskToStage = (stageIndex: number) => {
    setCardData(prev => ({
      ...prev,
      workflowStages: prev.workflowStages?.map((stage, i) =>
        i === stageIndex
          ? { ...stage, tasks: [...stage.tasks, { title: '' }] }
          : stage
      )
    }));
  };

  const removeTaskFromStage = (stageIndex: number, taskIndex: number) => {
    setCardData(prev => ({
      ...prev,
      workflowStages: prev.workflowStages?.map((stage, i) =>
        i === stageIndex
          ? { ...stage, tasks: stage.tasks.filter((_, ti) => ti !== taskIndex) }
          : stage
      )
    }));
  };

  const updateStageTask = (stageIndex: number, taskIndex: number, field: 'title' | 'description', value: string) => {
    setCardData(prev => ({
      ...prev,
      workflowStages: prev.workflowStages?.map((stage, i) =>
        i === stageIndex
          ? {
              ...stage,
              tasks: stage.tasks.map((task, ti) =>
                ti === taskIndex ? { ...task, [field]: value } : task
              )
            }
          : stage
      )
    }));
  };

  const toggleWorkflowMode = () => {
    setCardData(prev => ({
      ...prev,
      workflowEnabled: !prev.workflowEnabled,
      workflowStages: prev.workflowEnabled ? [] : prev.workflowStages
    }));
    setShowWorkflow(!showWorkflow);
  };

  const getMemberName = (userId: string) => {
    const member = boardMembers.find(m => m.userId._id === userId);
    return member ? `${member.userId.firstName} ${member.userId.lastName}` : 'Unknown';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 w-96 max-h-[90vh] overflow-y-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <input
            type="text"
            value={cardData.title}
            onChange={(e) => setCardData(prev => ({ ...prev, title: e.target.value }))}
            onKeyDown={handleKeyDown}
            placeholder="Enter card title..."
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
            disabled={isLoading}
          />
        </div>

        {/* Description */}
        <div>
          <textarea
            value={cardData.description}
            onChange={(e) => setCardData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Add a description..."
            rows={3}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            disabled={isLoading}
          />
        </div>

        {/* Advanced Options Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          disabled={isLoading}
        >
          {showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
        </button>

        {/* Advanced Options */}
        {showAdvanced && (
          <div className="space-y-4">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={cardData.priority}
                onChange={(e) => setCardData(prev => ({
                  ...prev,
                  priority: e.target.value as CreateCardData['priority']
                }))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Due Date
              </label>
              <input
                type="date"
                onChange={(e) => setCardData(prev => ({
                  ...prev,
                  dueDate: e.target.value ? new Date(e.target.value) : undefined
                }))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>

            {/* Labels */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Labels
              </label>

              {/* Current Labels */}
              {cardData.labels && cardData.labels.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {cardData.labels.map((label, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full"
                    >
                      {label}
                      <button
                        type="button"
                        onClick={() => removeLabel(label)}
                        className="ml-1 text-blue-500 hover:text-blue-700"
                        disabled={isLoading}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Predefined Labels */}
              <div className="flex flex-wrap gap-1">
                {predefinedLabels.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => addLabel(label)}
                    disabled={cardData.labels?.includes(label) || isLoading}
                    className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                      cardData.labels?.includes(label)
                        ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Card Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Card Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={cardData.color || '#ffffff'}
                  onChange={(e) => setCardData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-12 h-8 rounded-md border border-gray-300 dark:border-gray-600 cursor-pointer"
                  title="Choose card color"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setCardData(prev => ({ ...prev, color: undefined }))}
                  className="px-3 py-1 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
                  disabled={isLoading}
                >
                  Default
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {cardData.color || 'Default'}
                </span>
              </div>
            </div>

            {/* Cover Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cover Image URL
              </label>
              <input
                type="url"
                value={cardData.coverImage || ''}
                onChange={(e) => setCardData(prev => ({ ...prev, coverImage: e.target.value || undefined }))}
                placeholder="https://example.com/image.jpg"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        {/* Workflow Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={cardData.workflowEnabled}
                onChange={toggleWorkflowMode}
                className="mr-2 rounded border-gray-300 dark:border-gray-600"
                disabled={isLoading}
              />
              Enable Sequential Workflow
            </label>
          </div>

          {cardData.workflowEnabled && (
            <div className="mt-3 space-y-3">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Assign tasks to different members in sequence. When one person completes their tasks, the card automatically moves to the next person.
              </p>

              {/* Auto-progress setting */}
              <label className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={cardData.autoProgressEnabled}
                  onChange={(e) => setCardData(prev => ({ ...prev, autoProgressEnabled: e.target.checked }))}
                  className="mr-2 rounded border-gray-300 dark:border-gray-600"
                  disabled={isLoading}
                />
                Auto-progress to next stage when all tasks completed
              </label>

              {/* Workflow Stages */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {cardData.workflowStages?.map((stage, stageIndex) => (
                  <div
                    key={stageIndex}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          #{stageIndex + 1}
                        </span>
                        <input
                          type="text"
                          value={stage.name}
                          onChange={(e) => updateWorkflowStage(stageIndex, 'name', e.target.value)}
                          placeholder="Stage name (e.g., Design, Development)"
                          className="flex-1 text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          disabled={isLoading}
                        />
                      </div>
                      {cardData.workflowStages && cardData.workflowStages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeWorkflowStage(stageIndex)}
                          className="text-red-500 hover:text-red-700 ml-2"
                          disabled={isLoading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Assign to user */}
                    <div className="mb-2">
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Assign to:
                      </label>
                      <select
                        value={stage.assignedTo}
                        onChange={(e) => updateWorkflowStage(stageIndex, 'assignedTo', e.target.value)}
                        className="w-full text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        disabled={isLoading}
                      >
                        <option value="">Select member...</option>
                        {boardMembers.map((member) => (
                          <option key={member.userId._id} value={member.userId._id}>
                            {member.userId.firstName} {member.userId.lastName} ({member.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Tasks for this stage */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                        Tasks for this stage:
                      </label>

                      {stage.tasks.map((task, taskIndex) => (
                        <div key={taskIndex} className="flex items-start gap-2">
                          <input
                            type="text"
                            value={task.title}
                            onChange={(e) => updateStageTask(stageIndex, taskIndex, 'title', e.target.value)}
                            placeholder="Task title"
                            className="flex-1 text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            disabled={isLoading}
                          />
                          <button
                            type="button"
                            onClick={() => removeTaskFromStage(stageIndex, taskIndex)}
                            className="text-red-500 hover:text-red-700"
                            disabled={isLoading}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => addTaskToStage(stageIndex)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                        disabled={isLoading}
                      >
                        <Plus className="w-3 h-3" />
                        Add Task
                      </button>
                    </div>

                    {/* Arrow to next stage */}
                    {stageIndex < (cardData.workflowStages?.length || 0) - 1 && (
                      <div className="flex justify-center mt-2">
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add stage button */}
              <button
                type="button"
                onClick={addWorkflowStage}
                className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                <Plus className="w-4 h-4" />
                Add Workflow Stage
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            disabled={!cardData.title.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
          >
            {isLoading ? 'Creating...' : 'Create Card'}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200 text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateCardForm;