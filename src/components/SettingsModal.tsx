'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import useSettingsStore, { InterruptTypeItem } from '@/store/useSettingsStore';
import { useI18n } from '@/locales/client';
import { XIcon } from 'lucide-react'; // 削除ボタン用アイコン

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const t = useI18n();
  const { interruptTypes, actions } = useSettingsStore((s) => s);
  const [newTypeName, setNewTypeName] = useState('');

  const handleAddType = () => {
    if (newTypeName.trim()) {
      actions.addInterruptType(newTypeName.trim());
      setNewTypeName('');
    }
  };

  const handleRemoveType = (id: string) => {
    actions.removeInterruptType(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          {/* TODO: 多言語対応 */}
          <DialogTitle>{t('SettingsModal.title')}</DialogTitle>
          <DialogDescription>
            {t('SettingsModal.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <Label htmlFor="new-interrupt-type" className="text-sm font-medium">
              {t('SettingsModal.addNewTypeLabel')}
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="new-interrupt-type"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder={t('SettingsModal.newTypePlaceholder')}
              />
              <Button onClick={handleAddType} size="sm">{t('SettingsModal.addButton')}</Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('SettingsModal.existingTypesLabel')}
            </h3>
            <ul className="space-y-1 max-h-60 overflow-y-auto border rounded-md p-2">
              {interruptTypes.map((type) => (
                <li key={type.id} className="flex items-center justify-between p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <span className={type.isDefault ? 'text-gray-500 dark:text-gray-400 italic' : ''}>
                    {type.label}
                    {type.isDefault && <span className="text-xs">(Default)</span>}
                  </span>
                  {!type.isDefault && (
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveType(type.id)}>
                      <XIcon className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('SettingsModal.closeButton')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 