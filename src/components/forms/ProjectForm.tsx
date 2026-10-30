import { useState, type FormEvent } from 'react';
import { createProject, updateProject, type ProjectInput } from '../../db/repo';
import { useSubmit } from '../../db/hooks';
import type { Project } from '../../db/types';
import { PROJECT_STATUS } from '../../lib/labels';
import { Button } from '../ui/Button';
import { Field, FormError, Select, TextArea, TextInput } from '../ui/Fields';
import { Modal } from '../ui/Modal';

export const EMPTY_PROJECT: ProjectInput = { name: '', icon: '', description: '', status: 'idea', githubUrl: '', demoUrl: '' };

const ICONS = ['▣', '🚀', '💡', '📈', '🛠️', '🌐', '🤖', '🎨', '📱', '💰', '🎬', '📦'];

/**
 * Создание и редактирование проекта.
 * onSubmitOverride — для превращения идеи в проект (своя логика сохранения).
 */
export function ProjectForm({
  project,
  initial,
  title,
  submitLabel,
  note,
  onSubmitOverride,
  onClose,
  onSaved,
}: {
  project?: Project;
  initial?: ProjectInput;
  title?: string;
  submitLabel?: string;
  note?: string;
  onSubmitOverride?: (input: ProjectInput) => Promise<unknown>;
  onClose: () => void;
  onSaved?: (id?: string) => void;
}) {
  const [v, setV] = useState<ProjectInput>(project ?? initial ?? EMPTY_PROJECT);
  const { saving, error, submit } = useSubmit();
  const set = <K extends keyof ProjectInput>(k: K, val: ProjectInput[K]) => setV((s) => ({ ...s, [k]: val }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    let createdId: string | undefined;
    const ok = await submit(async () => {
      if (onSubmitOverride) await onSubmitOverride(v);
      else if (project) await updateProject(project.id, v);
      else createdId = (await createProject(v)).id;
    }, project ? 'Проект сохранён' : 'Проект создан');
    if (ok) {
      onSaved?.(createdId);
      onClose();
    }
  }

  return (
    <Modal
      title={title ?? (project ? 'Редактировать проект' : 'Новый проект')}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Отмена</Button>
          <Button variant="primary" type="submit" form="project-form" loading={saving}>
            {submitLabel ?? (project ? 'Сохранить' : 'Создать')}
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={onSubmit} className="grid gap-4">
        {note && <p className="rounded-xl bg-white/8 px-3 py-2 text-sm text-white/80">{note}</p>}
        <Field label="Название">{(id) => <TextInput id={id} value={v.name} onChange={(e) => set('name', e.target.value)} maxLength={80} required />}</Field>
        <div>
          <span className="text-muted mb-1.5 block text-xs font-medium">Иконка</span>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Иконка">
            {ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                role="radio"
                aria-checked={v.icon === icon}
                onClick={() => set('icon', icon)}
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${v.icon === icon ? 'bg-white/25 ring-1 ring-white/60' : 'bg-black/25 hover:bg-white/10'}`}
              >
                {icon}
              </button>
            ))}
            <TextInput aria-label="Своя иконка (эмодзи)" value={ICONS.includes(v.icon) ? '' : v.icon} onChange={(e) => set('icon', e.target.value.slice(0, 4))} placeholder="Своя" className="!h-10 w-20 text-center" />
          </div>
        </div>
        <Field label="Краткое описание">{(id) => <TextArea id={id} value={v.description} onChange={(e) => set('description', e.target.value)} maxLength={400} />}</Field>
        <Field label="Статус">
          {(id) => <Select id={id} value={v.status} onChange={(e) => set('status', e.target.value as ProjectInput['status'])} options={Object.entries(PROJECT_STATUS)} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="GitHub URL">{(id) => <TextInput id={id} inputMode="url" autoCapitalize="off" autoCorrect="off" value={v.githubUrl} onChange={(e) => set('githubUrl', e.target.value)} placeholder="https://github.com/…" />}</Field>
          <Field label="Demo URL">{(id) => <TextInput id={id} inputMode="url" autoCapitalize="off" autoCorrect="off" value={v.demoUrl} onChange={(e) => set('demoUrl', e.target.value)} placeholder="https://…" />}</Field>
        </div>
        <FormError message={error} />
      </form>
    </Modal>
  );
}
