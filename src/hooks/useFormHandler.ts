import { useState, FormEvent } from 'react';

interface UseFormHandlerOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => void;
  validate?: (values: T) => boolean;
  resetOnSubmit?: boolean;
}

export function useFormHandler<T>({
  initialValues,
  onSubmit,
  validate = () => true,
  resetOnSubmit = true,
}: UseFormHandlerOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (validate(values)) {
      onSubmit(values);
      if (resetOnSubmit) {
        setValues(initialValues);
      }
    }
  };

  const updateValue = <K extends keyof T>(key: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setValues(initialValues);
  };

  return {
    values,
    setValues,
    updateValue,
    handleSubmit,
    resetForm,
  };
}