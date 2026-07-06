export interface DoctorCheck {
  name: string;
  status: 'ok' | 'warn' | 'error';
  message?: string;
}

export interface DoctorResult {
  checks: DoctorCheck[];
}
