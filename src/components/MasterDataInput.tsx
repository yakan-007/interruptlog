'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MasterDataItem {
  id: string;
  name: string;
}

interface MasterDataInputProps {
  label: string;
  idPrefix: string;
  items: MasterDataItem[];
  selectedValue: string | undefined; // `undefined` も許容する
  onValueChange: (value: string) => void;
  selectPlaceholder: string;
  inputPlaceholder: string;
  className?: string;
}

const MasterDataInput: React.FC<MasterDataInputProps> = ({
  label,
  idPrefix,
  items,
  selectedValue,
  onValueChange,
  selectPlaceholder,
  inputPlaceholder,
  className,
}) => {
  const selectedItemId = items.find(item => item.name === selectedValue)?.id || '';

  return (
    <div className={className}>
      <Label htmlFor={`${idPrefix}-input`} className="text-sm font-medium">{label}</Label>
      <div className="flex gap-2 mt-1">
        <Select
          value={selectedItemId}
          onValueChange={id => {
            const selectedItem = items.find(item => item.id === id);
            if (selectedItem) {
              onValueChange(selectedItem.name);
            }
          }}
        >
          <SelectTrigger className="w-32" id={`${idPrefix}-select`}>
            <SelectValue placeholder={selectPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {items.map(item => (
              <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id={`${idPrefix}-input`}
          placeholder={inputPlaceholder}
          value={selectedValue || ''} // `undefined` の場合は空文字に
          onChange={e => onValueChange(e.target.value)}
          className="flex-grow"
        />
      </div>
    </div>
  );
};

export default MasterDataInput; 