'use client';
import React, { useState } from 'react';
import { Plus, List, LayoutGrid, Search, AlertTriangle, Clock, CheckCircle2, Circle, Zap } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import CreateTaskForm from './CreateTaskForm';
import KanbanBoard from './KanbanBoard';
import TaskListView from './TaskListView';
import AutomationRules from './AutomationRules';
import Icon from '@/components/ui/AppIcon';



export default function WorkflowContent() {
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [showAutomation, setShowAutomation] = useState(false);

  const statCards = [
    { id: 'wstat-pending', label: 'Pending', value: 14, icon: Circle, color: 'text-muted-foreground', bg: 'bg-muted' },
    { id: 'wstat-inprogress', label: 'In Progress', value: 9, icon: Clock, color: 'text-primary', bg: 'bg-primary/10' },
    { id: 'wstat-overdue', label: 'Overdue', value: 18, icon: AlertTriangle, color: 'text-danger', bg: 'bg-danger/10' },
    { id: 'wstat-completed', label: 'Completed (MTD)', value: 67, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  ];

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Workflows & Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track all case tasks and automated follow-up sequences</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAutomation(!showAutomation)}
            className={`btn-secondary flex items-center gap-1.5 ${showAutomation ? 'bg-primary/10 text-primary border-primary/30' : ''}`}
          >
            <Zap size={15} /> Automation Rules
          </button>
          <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-1.5">
            <Plus size={15} /> Create Task
          </button>
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards?.map(s => {
          const Icon = s?.icon;
          return (
            <div key={s?.id} className="card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${s?.bg} flex items-center justify-center shrink-0`}>
                <Icon size={17} className={s?.color} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground tabular-nums">{s?.value}</p>
                <p className="text-xs text-muted-foreground">{s?.label}</p>
              </div>
            </div>
          );
        })}
      </div>
      {/* Automation Panel */}
      {showAutomation && (
        <div className="fade-in">
          <AutomationRules />
        </div>
      )}
      {/* View Controls + Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks by client or type..."
            value={search}
            onChange={e => setSearch(e?.target?.value)}
            className="input-field pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {['All', 'High', 'Medium', 'Low']?.map(p => (
            <button
              key={`pf-${p}`}
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 border ${
                priorityFilter === p
                  ? p === 'High' ? 'bg-danger/10 text-danger border-danger/30' : p === 'Medium' ? 'bg-warning/10 text-warning border-warning/30' : p === 'Low' ? 'bg-success/10 text-success border-success/30' : 'bg-primary/10 text-primary border-primary/30' :'bg-card text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center bg-muted rounded-lg p-1 ml-auto">
          <button
            onClick={() => setView('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${view === 'kanban' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <LayoutGrid size={14} /> Kanban
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${view === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <List size={14} /> List
          </button>
        </div>
      </div>
      {/* Board / List */}
      {view === 'kanban' ? (
        <KanbanBoard search={search} priorityFilter={priorityFilter} />
      ) : (
        <TaskListView search={search} priorityFilter={priorityFilter} />
      )}
      {/* Create Task Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Task" subtitle="Assign a new task to a client case" size="lg">
        <CreateTaskForm onClose={() => setCreateOpen(false)} />
      </Modal>
    </div>
  );
}