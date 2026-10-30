import { useState, type FormEvent } from 'react';
import { createIdea, updateIdea, type IdeaInput } from '../../db/repo';
import { useSubmit } from '../../db/hooks';
import type { Idea } from '../../db/types';
import { IDEA_STATUS, PRIORITY } from '../../lib/labels';
import { Button } from '../ui/Button';
import { Field, FormError, Select, TextArea, TextInput } from '../ui/Fields';
import { Modal } from '../ui/Modal';

export function IdeaForm({ idea, onClose }: { idea?: Idea; onClose: () => void }) {
  const [v, setV] = useState<IdeaInput>(
    idea ?? { title: '', description: '', audience: '', potential: '', priority: 'medium', status: 'new', comments: '' },
  );
  const { saving, error, submit } = useSubmit();
  const set = <K extends keyof IdeaInput>(k: K, val: IdeaInput[K]) => setV((s) => ({ ...s, [k]: val }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const ok = await submit(() => (idea ? updateIdea(idea.id, v) : createIdea(v)), idea ? 'Идея сохранена' : 'Идея добавлена');
    if (ok) onClose();
  }

  return (
    <Modal
      title={idea ? 'Редактировать идею' : 'Новая идея'}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Отмена</Button>
          <Button variant="primary" type="submit" form="idea-form" loading={saving}>
            {idea ? 'Сохранить' : 'Добавить'}
          </Button>
        </>
      }
    >
      <form id="idea-form" onSubmit={onSubmit} className="grid gap-4">
        <Field label="Название">{(id) => <TextInput id={id} value={v.title} onChange={(e) => set('title', e.target.value)} maxLength={120} required />}</Field>
        <Field label="Описание">{(id) => <TextArea id={id} value={v.description} onChange={(e) => set('description', e.target.value)} maxLength={2000} />}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Аудитория">{(id) => <TextInput id={id} value={v.audience} onChange={(e) => set('audience', e.target.value)} placeholder="Для кого" maxLength={200} />}</Field>
          <Field label="Потенциал заработка">{(id) => <TextInput id={id} value={v.potential} onChange={(e) => set('potential', e.target.value)} placeholder="Например, 30 000 ₽/мес" maxLength={200} />}</Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Приоритет">
            {(id) => <Select id={id} value={v.priority} onChange={(e) => set('priority', e.target.value as IdeaInput['priority'])} options={Object.entries(PRIORITY)} />}
          </Field>
          <Field label="Статус">
            {(id) => <Select id={id} value={v.status} onChange={(e) => set('status', e.target.value as IdeaInput['status'])} options={Object.entries(IDEA_STATUS)} />}
          </Field>
        </div>
        <Field label="Комментарии">{(id) => <TextArea id={id} value={v.comments} onChange={(e) => set('comments', e.target.value)} rows={2} maxLength={2000} />}</Field>
        <FormError message={error} />
      </form>
    </Modal>
  );
}
