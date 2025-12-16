import { useState, useCallback, useEffect, FormEvent } from 'react';

export type ValidationErrors<T> = Partial<Record<keyof T, string>>;
export type ValidationSchema<T> = (state: T) => ValidationErrors<T>;

interface UseFormHandlerOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => void | Promise<void>;
  validate?: (values: T) => boolean;
  validationSchema?: ValidationSchema<T>;
  resetOnSubmit?: boolean;
  validateOnChange?: boolean;
  debounceMs?: number;
}

export function useFormHandler<T extends Record<string, any>>({
  initialValues,
  onSubmit,
  validate = () => true,
  validationSchema,
  resetOnSubmit = true,
  validateOnChange = false,
  debounceMs = 300,
}: UseFormHandlerOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<ValidationErrors<T>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout>();

  // Enhanced validation with schema support
  const validateForm = useCallback((): boolean => {
    if (validationSchema) {
      const newErrors = validationSchema(values);
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    }
    return validate(values);
  }, [values, validationSchema, validate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(values);
      if (resetOnSubmit) {
        setValues(initialValues);
        setIsDirty(false);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);

    if (validateOnChange && validationSchema) {
      // Clear existing timeout
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }

      // Set new timeout for debounced validation
      const timeout = setTimeout(() => {
        const newState = { ...values, [key]: value };
        const newErrors = validationSchema(newState);
        setErrors(newErrors);
      }, debounceMs);

      setDebounceTimeout(timeout);
    }
  }, [values, validationSchema, validateOnChange, debounceMs, debounceTimeout]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setIsDirty(false);
    setIsSubmitting(false);
  }, [initialValues]);

  // Check if form is valid
  const isValid = Object.keys(errors).length === 0 && validate(values);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [debounceTimeout]);

  return {
    values,
    errors,
    isValid,
    isSubmitting,
    isDirty,
    setValues,
    updateValue,
    handleSubmit,
    resetForm,
    validate: validateForm,
  };
}

/**
 * Simple form state hook without validation (for backward compatibility)
 */
export function useSimpleForm<T extends Record<string, any>>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);

  const updateValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setValues(initialValues);
  }, [initialValues]);

  return {
    values,
    setValues,
    updateValue,
    resetForm,
  };
}