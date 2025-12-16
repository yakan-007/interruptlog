// Type-safe validation schemas without external dependencies

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

// Task validation
export interface TaskInput {
  name: string;
  categoryId?: string;
}

export function validateTaskInput(input: unknown): ValidationResult<TaskInput> {
  if (typeof input !== 'object' || input === null) {
    return { success: false, errors: ['Input must be an object'] };
  }

  const obj = input as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof obj.name !== 'string') {
    errors.push('Name must be a string');
  } else if (obj.name.trim().length === 0) {
    errors.push('Name cannot be empty');
  } else if (obj.name.length > 200) {
    errors.push('Name cannot exceed 200 characters');
  }

  if (obj.categoryId !== undefined && typeof obj.categoryId !== 'string') {
    errors.push('Category ID must be a string');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name: obj.name as string,
      categoryId: obj.categoryId as string | undefined,
    }
  };
}

// Category validation
export interface CategoryInput {
  name: string;
  color: string;
}

export function validateCategoryInput(input: unknown): ValidationResult<CategoryInput> {
  if (typeof input !== 'object' || input === null) {
    return { success: false, errors: ['Input must be an object'] };
  }

  const obj = input as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof obj.name !== 'string') {
    errors.push('Name must be a string');
  } else if (obj.name.trim().length === 0) {
    errors.push('Name cannot be empty');
  } else if (obj.name.length > 100) {
    errors.push('Name cannot exceed 100 characters');
  }

  if (typeof obj.color !== 'string') {
    errors.push('Color must be a string');
  } else if (!/^#[0-9A-F]{6}$/i.test(obj.color)) {
    errors.push('Color must be a valid hex color (e.g., #FF0000)');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      name: obj.name as string,
      color: obj.color as string,
    }
  };
}

// Event time validation
export interface EventTimeInput {
  eventId: string;
  newEndTime: number;
  gapActivityName?: string;
}

export function validateEventTimeInput(input: unknown): ValidationResult<EventTimeInput> {
  if (typeof input !== 'object' || input === null) {
    return { success: false, errors: ['Input must be an object'] };
  }

  const obj = input as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof obj.eventId !== 'string') {
    errors.push('Event ID must be a string');
  } else if (obj.eventId.trim().length === 0) {
    errors.push('Event ID cannot be empty');
  }

  if (typeof obj.newEndTime !== 'number') {
    errors.push('New end time must be a number');
  } else if (obj.newEndTime <= 0) {
    errors.push('New end time must be positive');
  } else if (obj.newEndTime > Date.now()) {
    errors.push('New end time cannot be in the future');
  }

  if (obj.gapActivityName !== undefined) {
    if (typeof obj.gapActivityName !== 'string') {
      errors.push('Gap activity name must be a string');
    } else if (obj.gapActivityName.length > 200) {
      errors.push('Gap activity name cannot exceed 200 characters');
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      eventId: obj.eventId as string,
      newEndTime: obj.newEndTime as number,
      gapActivityName: obj.gapActivityName as string | undefined,
    }
  };
}

// Interrupt category validation
export interface InterruptCategoryInput {
  categoryId: 'category1' | 'category2' | 'category3' | 'category4' | 'category5' | 'category6';
  name: string;
}

export function validateInterruptCategoryInput(input: unknown): ValidationResult<InterruptCategoryInput> {
  if (typeof input !== 'object' || input === null) {
    return { success: false, errors: ['Input must be an object'] };
  }

  const obj = input as Record<string, unknown>;
  const errors: string[] = [];
  const validCategoryIds = ['category1', 'category2', 'category3', 'category4', 'category5', 'category6'];

  if (typeof obj.categoryId !== 'string') {
    errors.push('Category ID must be a string');
  } else if (!validCategoryIds.includes(obj.categoryId)) {
    errors.push('Category ID must be one of: ' + validCategoryIds.join(', '));
  }

  if (typeof obj.name !== 'string') {
    errors.push('Name must be a string');
  } else if (obj.name.trim().length === 0) {
    errors.push('Name cannot be empty');
  } else if (obj.name.length > 50) {
    errors.push('Name cannot exceed 50 characters');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      categoryId: obj.categoryId as InterruptCategoryInput['categoryId'],
      name: obj.name as string,
    }
  };
}

// Generic validation helper
export function createValidator<T>(
  validationFn: (input: unknown) => ValidationResult<T>
) {
  return (input: unknown): T => {
    const result = validationFn(input);
    if (!result.success) {
      throw new Error(`Validation failed: ${result.errors?.join(', ')}`);
    }
    return result.data!;
  };
}

// Pre-created validators
export const validateTask = createValidator(validateTaskInput);
export const validateCategory = createValidator(validateCategoryInput);
export const validateEventTime = createValidator(validateEventTimeInput);
export const validateInterruptCategory = createValidator(validateInterruptCategoryInput);