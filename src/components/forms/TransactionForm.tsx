import { useState, type FormEvent } from 'react';
import { addTransaction, updateTransaction, type TransactionInput } from '../../db/repo';
import { useProjects, useSubmit } from '../../db/hooks';
import type { Transaction, TransactionType } from '../../db/types';
import { todayISO } from '../../lib/date';
import { categoriesFor } from '../../lib/labels';
import { formatRub, parseRub } from '../../lib/money';
import { Button } from '../ui/Button';
import { Field, FormError, Segmented, Select, TextArea, TextInput } from '../ui/Fields';
import { Modal } from '../ui/Modal';

export function TransactionForm({
  transaction,
  defaultType = 'income',
  defaultProjectId = null,
  onClose,
}: {
  transaction?: Transaction;
  defaultType?: TransactionType;
  defaultProjectId?: string | null;
  onClose: () => void;
}) {
  const projects = useProjects();
  const [type, setType] = useState<TransactionType>(transaction?.type ?? defaultType);
  const [title, setTitle] = useState(transaction?.title ?? '');
  const [amount, setAmount] = useState(transaction ? String(transaction.amount / 100).replace('.', ',') : '');
  const [date, setDate] = useState(transaction?.date ?? todayISO());
  const [category, setCategory] = useState<string>(transaction?.category ?? 'other');
  const [projectId, setProjectId] = useState<string>(transaction?.projectId ?? defaultProjectId ?? '');
  const [comment, setComment] = useState(transaction?.comment ?? '');
  const { saving, error, setError, submit } = useSubmit();

  const categories = categoriesFor(type);
  const parsed = parseRub(amount);

  function changeType(t: TransactionType) {
    setType(t);
    if (!(category in categoriesFor(t))) setCategory('other');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (parsed === null) {
      setError('Введите сумму больше нуля, например 1500 или 1 500,50.');
      return;
    }
    const input: TransactionInput = {
      title,
      type,
      amount: parsed,
      date,
      category: category as TransactionInput['category'],
      projectId: projectId || null,
      comment,
    };
    const ok = await submit(
      () => (transaction ? updateTransaction(transaction.id, input) : addTransaction(input)),
      transaction ? 'Операция сохранена' : type === 'income' ? 'Доход добавлен' : 'Расход добавлен',
    );
    if (ok) onClose();
  }

  const projectOptions: [string, string][] = [['', 'Без проекта'], ...(projects ?? []).filter((p) => !p.archived || p.id === projectId).map((p): [string, string] => [p.id, `${p.icon} ${p.name}`])];

  return (
    <Modal
      title={transaction ? 'Редактировать операцию' : type === 'income' ? 'Новый доход' : 'Новый расход'}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Отмена</Button>
          <Button variant="primary" type="submit" form="tx-form" loading={saving}>
            {transaction ? 'Сохранить' : 'Добавить'}
          </Button>
        </>
      }
    >
      <form id="tx-form" onSubmit={onSubmit} className="grid gap-4">
        <Segmented label="Тип операции" value={type} onChange={changeType} options={[['income', 'Доход'], ['expense', 'Расход']]} />
        <Field label="Название">{(id) => <TextInput id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder={type === 'income' ? 'Оплата заказа' : 'Подписка'} required />}</Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Сумма, ₽" hint={parsed !== null ? formatRub(parsed) : undefined}>
            {(id) => (
              <TextInput
                id={id}
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                aria-invalid={amount !== '' && parsed === null}
                required
              />
            )}
          </Field>
          <Field label="Дата">{(id) => <TextInput id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />}</Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Категория">{(id) => <Select id={id} value={category} onChange={(e) => setCategory(e.target.value)} options={Object.entries(categories)} />}</Field>
          <Field label="Проект" hint="Без проекта — влияет только на общий бюджет">
            {(id) => <Select id={id} value={projectId} onChange={(e) => setProjectId(e.target.value)} options={projectOptions} />}
          </Field>
        </div>
        <Field label="Комментарий">{(id) => <TextArea id={id} value={comment} onChange={(e) => setComment(e.target.value)} rows={2} maxLength={500} />}</Field>
        <FormError message={error} />
      </form>
    </Modal>
  );
}
