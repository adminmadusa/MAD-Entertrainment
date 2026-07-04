import { SessionState } from './types';
import { EngineState } from './constants';

export class SessionManager {
  private activeSession: SessionState | null = null;

  startSession(taskId: string): SessionState {
    this.activeSession = {
      sessionId: `sess_${Math.random().toString(36).substring(2, 11)}`,
      taskId,
      state: 'Booting',
      startTime: Date.now(),
      loadedModules: [],
      skillsExecuted: [],
      validatorsExecuted: [],
      cacheHits: 0
    };
    return this.activeSession;
  }

  updateState(state: EngineState) {
    if (this.activeSession) {
      this.activeSession.state = state;
    }
  }

  trackModuleLoad(moduleName: string) {
    if (this.activeSession && !this.activeSession.loadedModules.includes(moduleName)) {
      this.activeSession.loadedModules.push(moduleName);
    }
  }

  trackSkillExecute(skillId: string) {
    if (this.activeSession && !this.activeSession.skillsExecuted.includes(skillId)) {
      this.activeSession.skillsExecuted.push(skillId);
    }
  }

  trackValidatorExecute(validatorId: string) {
    if (this.activeSession && !this.activeSession.validatorsExecuted.includes(validatorId)) {
      this.activeSession.validatorsExecuted.push(validatorId);
    }
  }

  trackCacheHit() {
    if (this.activeSession) {
      this.activeSession.cacheHits++;
    }
  }

  endSession(state: 'Completed' | 'Failed'): SessionState {
    if (!this.activeSession) {
      throw new Error('No active session to end.');
    }
    this.activeSession.state = state;
    this.activeSession.endTime = Date.now();
    const session = this.activeSession;
    this.activeSession = null;
    return session;
  }

  getActiveSession(): SessionState | null {
    return this.activeSession;
  }
}
