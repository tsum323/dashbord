import { useState, type FormEvent } from 'react';
import { createTask, updateTask, type TaskInput } from '../../db/repo';
import { useProjects, useSubmit } from '../../db/hooks';
import type { Task } from '../../db/types';
import { PRIORITY, TASK_STATUS } from '../../lib/labels';
import { Button } from '../ui/Button';
import { Field, FormError, Select, TextArea, TextInput } from '../ui/Fields';
import { Modal } from '../ui/Modal';

export function TaskForm({ task, projectId, onClose }: { task?: Task; projectId?: string; onClose: () => void }) {
  const projects = useProjects();
  const [v, setV] = useState<TaskInput>(
    task ?? { title: '', description: '', projectId: projectId ?? '', priority: 'medium', dueDate: null, status: 'todo' },
  );
  const { saving, error, submit } = useSubmit();
  const set = <K extends keyof TaskInput>(k: K, val: TaskInput[K]) => setV((s) => ({ ...s, [k]: val }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const ok = await submit(() => (task ? updateTask(task.id, v) : createTask(v)), task ? 'Задача сохранена' : 'Задача создана');
    if (ok) onClose();
  }

  const options: [string, string][] = [
    ['', 'Выберите проект'],
    ...(projects ?? []).filter((p) => !p.archived || p.id === v.projectId).map((p): [string, string] => [p.id, `${p.icon} ${p.name}`]),
  ];

  return (
    <Modal
      title={task ? 'Редактировать задачу' : 'Новая задача'}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Отмена</Button>
          <Button variant="primary" type="submit" form="task-form" loading={saving}>
            {task ? 'Сохранить' : 'Создать'}
          </Button>
        </>
      }
    >
      <form id="task-form" onSubmit={onSubmit} className="grid gap-4">
        <Field label="Название">{(id) => <TextInput id={id} value={v.title} onChange={(e) => set('title', e.target.value)} maxLength={120} required />}</Field>
        <Field label="Описание">{(id) => <TextArea id={id} value={v.description} onChange={(e) => set('description', e.target.value)} rows={2} maxLength={1000} />}</Field>
        {!projectId && (
          <Field label="Проект">{(id) => <Select id={id} value={v.projectId} onChange={(e) => set('projectId', e.target.value)} options={options} required />}</Field>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Приоритет">
            {(id) => <Select id={id} value={v.priority} onChange={(e) => set('priority', e.target.value as TaskInput['priority'])} options={Object.entries(PRIORITY)} />}
          </Field>
          <Field label="Срок">{(id) => <TextInput id={id} type="date" value={v.dueDate ?? ''} onChange={(e) => set('dueDate', e.target.value || null)} />}</Field>
        </div>
        <Field label="Статус">
          {(id) => <Select id={id} value={v.status} onChange={(e) => set('status', e.target.value as TaskInput['status'])} options={Object.entries(TASK_STATUS)} />}
        </Field>
        <FormError message={error} />
      </form>
    </Modal>
  );
}
