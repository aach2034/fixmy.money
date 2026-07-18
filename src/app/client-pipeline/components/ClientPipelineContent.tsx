'use client';
import React, { useState } from 'react';
import { ArrowRight, Plus, MoreHorizontal, Phone, Mail, Clock } from 'lucide-react';

type PipelineStage = 'Lead' | 'Consultation' | 'Signed' | 'Onboarding' | 'Round 1' | 'Round 2' | 'Monitoring' | 'Graduated';

interface PipelineClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  score: number;
  daysInStage: number;
  plan: string;
  assignedStaff: string;
  priority: 'high' | 'medium' | 'low';
}

interface PipelineColumn {
  stage: PipelineStage;
  color: string;
  headerBg: string;
  clients: PipelineClient[];
}

const initialColumns: PipelineColumn[] = [
  {
    stage: 'Lead',
    color: 'text-muted-foreground',
    headerBg: 'bg-muted',
    clients: [
      { id: 'p-001', name: 'Jermaine Patterson', email: 'j.patterson@gmail.com', phone: '(404) 555-0223', score: 498, daysInStage: 2, plan: 'Starter', assignedStaff: 'Marcus Reed', priority: 'medium' },
      { id: 'p-002', name: 'Latoya Freeman', email: 'l.freeman@gmail.com', phone: '(678) 555-0341', score: 512, daysInStage: 5, plan: 'Growth', assignedStaff: 'Keisha James', priority: 'high' },
    ],
  },
  {
    stage: 'Consultation',
    color: 'text-info',
    headerBg: 'bg-info/10',
    clients: [
      { id: 'p-003', name: 'Marcus Webb', email: 'm.webb@outlook.com', phone: '(512) 555-0187', score: 534, daysInStage: 3, plan: 'Growth', assignedStaff: 'Marcus Reed', priority: 'medium' },
    ],
  },
  {
    stage: 'Signed',
    color: 'text-primary',
    headerBg: 'bg-primary/10',
    clients: [
      { id: 'p-004', name: 'Tanisha Brooks', email: 'tanisha.b@gmail.com', phone: '(678) 555-0114', score: 521, daysInStage: 1, plan: 'Starter', assignedStaff: 'Keisha James', priority: 'high' },
      { id: 'p-005', name: 'Carlos Mendez', email: 'c.mendez@gmail.com', phone: '(305) 555-0892', score: 547, daysInStage: 4, plan: 'Growth', assignedStaff: 'Marcus Reed', priority: 'low' },
    ],
  },
  {
    stage: 'Onboarding',
    color: 'text-warning',
    headerBg: 'bg-warning/10',
    clients: [
      { id: 'p-006', name: 'Priya Nambiar', email: 'priya.n@outlook.com', phone: '(512) 555-0247', score: 558, daysInStage: 6, plan: 'Growth', assignedStaff: 'Keisha James', priority: 'medium' },
    ],
  },
  {
    stage: 'Round 1',
    color: 'text-warning',
    headerBg: 'bg-warning/10',
    clients: [
      { id: 'p-007', name: 'Darnell Washington', email: 'darnell.w@gmail.com', phone: '(404) 555-0182', score: 582, daysInStage: 18, plan: 'Growth', assignedStaff: 'Keisha James', priority: 'high' },
      { id: 'p-008', name: 'Adriana Morales', email: 'adriana.m@gmail.com', phone: '(626) 555-0456', score: 601, daysInStage: 22, plan: 'Growth', assignedStaff: 'Keisha James', priority: 'medium' },
      { id: 'p-009', name: 'Shaniqua Davis', email: 'shaniqua.d@hotmail.com', phone: '(770) 555-0829', score: 544, daysInStage: 30, plan: 'Starter', assignedStaff: 'Marcus Reed', priority: 'high' },
    ],
  },
  {
    stage: 'Round 2',
    color: 'text-success',
    headerBg: 'bg-success/10',
    clients: [
      { id: 'p-010', name: 'Devon Clarke', email: 'devon.c@gmail.com', phone: '(617) 555-0349', score: 567, daysInStage: 14, plan: 'Agency', assignedStaff: 'Marcus Reed', priority: 'medium' },
      { id: 'p-011', name: 'Monique Simmons', email: 'monique.s@gmail.com', phone: '(312) 555-0512', score: 589, daysInStage: 11, plan: 'Growth', assignedStaff: 'Keisha James', priority: 'low' },
    ],
  },
  {
    stage: 'Monitoring',
    color: 'text-success',
    headerBg: 'bg-success/10',
    clients: [
      { id: 'p-012', name: 'Roberto Fuentes', email: 'rfuentes@gmail.com', phone: '(305) 555-0673', score: 697, daysInStage: 9, plan: 'Growth', assignedStaff: 'Marcus Reed', priority: 'low' },
      { id: 'p-013', name: 'Marcus Holloway', email: 'm.holloway@yahoo.com', phone: '(213) 555-0391', score: 658, daysInStage: 7, plan: 'Agency', assignedStaff: 'Keisha James', priority: 'low' },
    ],
  },
  {
    stage: 'Graduated',
    color: 'text-primary',
    headerBg: 'bg-primary/10',
    clients: [
      { id: 'p-014', name: 'Keisha Thornton', email: 'keisha.t@yahoo.com', phone: '(901) 555-0781', score: 742, daysInStage: 3, plan: 'Growth', assignedStaff: 'Keisha James', priority: 'low' },
    ],
  },
];

const priorityConfig = {
  high: { label: 'High', dot: 'bg-danger' },
  medium: { label: 'Med', dot: 'bg-warning' },
  low: { label: 'Low', dot: 'bg-success' },
};

function ClientCard({ client }: { client: PipelineClient }) {
  const p = priorityConfig[client.priority];
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
            {client.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground leading-tight">{client.name}</p>
            <p className="text-2xs text-muted-foreground">{client.plan}</p>
          </div>
        </div>
        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded">
          <MoreHorizontal size={13} className="text-muted-foreground" />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
          <span className="text-2xs text-muted-foreground">{p.label} priority</span>
        </div>
        <div className="flex items-center gap-1 text-2xs text-muted-foreground">
          <Clock size={10} />
          {client.daysInStage}d
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
        <span className="text-2xs font-semibold text-muted-foreground">Score: <span className="text-foreground">{client.score}</span></span>
        <div className="flex items-center gap-1.5">
          <button className="p-1 hover:bg-muted rounded transition-colors" title={client.email}>
            <Mail size={11} className="text-muted-foreground" />
          </button>
          <button className="p-1 hover:bg-muted rounded transition-colors" title={client.phone}>
            <Phone size={11} className="text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientPipelineContent() {
  const [columns] = useState<PipelineColumn[]>(initialColumns);
  const totalClients = columns.reduce((a, c) => a + c.clients.length, 0);

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Client Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{totalClients} clients across 8 stages · Apex Credit Solutions</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-primary flex items-center gap-1.5">
            <Plus size={15} /> Add Client
          </button>
        </div>
      </div>

      {/* Stage Summary */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {columns.map((col, i) => (
          <React.Fragment key={`summary-${col.stage}`}>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-semibold text-muted-foreground">{col.stage}</span>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${col.headerBg} ${col.color}`}>{col.clients.length}</span>
            </div>
            {i < columns.length - 1 && <ArrowRight size={12} className="text-muted-foreground/40 shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div key={`col-${col.stage}`} className="flex-shrink-0 w-56">
            {/* Column Header */}
            <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl ${col.headerBg} border border-border border-b-0`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${col.color}`}>{col.stage}</span>
                <span className={`text-2xs font-bold px-1.5 py-0.5 rounded-full bg-card ${col.color}`}>{col.clients.length}</span>
              </div>
              <button className="p-1 hover:bg-card/50 rounded transition-colors">
                <Plus size={12} className={col.color} />
              </button>
            </div>
            {/* Cards */}
            <div className="bg-muted/30 border border-border border-t-0 rounded-b-xl p-2 space-y-2 min-h-[120px]">
              {col.clients.map((client) => (
                <ClientCard key={client.id} client={client} />
              ))}
              {col.clients.length === 0 && (
                <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
                  No clients
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
