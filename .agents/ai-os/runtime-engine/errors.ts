export class RuntimeEngineError extends Error {
  constructor(message: string, public phase: string) {
    super(message);
    this.name = 'RuntimeEngineError';
  }
}

export class BootError extends RuntimeEngineError {
  constructor(message: string) {
    super(message, 'Booting');
    this.name = 'BootError';
  }
}

export class DependencyError extends RuntimeEngineError {
  constructor(message: string) {
    super(message, 'Resolving');
    this.name = 'DependencyError';
  }
}

export class RegistryError extends RuntimeEngineError {
  constructor(message: string) {
    super(message, 'Loading');
    this.name = 'RegistryError';
  }
}

export class ValidationError extends RuntimeEngineError {
  constructor(message: string) {
    super(message, 'Validating');
    this.name = 'ValidationError';
  }
}

export class SkillExecutionError extends RuntimeEngineError {
  constructor(message: string) {
    super(message, 'Executing');
    this.name = 'SkillExecutionError';
  }
}

export class TemplateError extends RuntimeEngineError {
  constructor(message: string) {
    super(message, 'Rendering');
    this.name = 'TemplateError';
  }
}
