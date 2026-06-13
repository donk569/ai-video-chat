import type { ConversationState } from '../shared/types';

export type StateTransition = {
  from: ConversationState;
  to: ConversationState;
};

const VALID_TRANSITIONS: Record<ConversationState, ConversationState[]> = {
  idle: ['listening'],
  listening: ['thinking', 'idle'],
  thinking: ['speaking', 'error'],
  speaking: ['idle', 'listening'],
  error: ['idle'],
};

export class StateMachine {
  private state: ConversationState = 'idle';
  private listeners: Array<(from: ConversationState, to: ConversationState) => void> = [];

  getState(): ConversationState {
    return this.state;
  }

  canTransition(to: ConversationState): boolean {
    return VALID_TRANSITIONS[this.state].includes(to);
  }

  transition(to: ConversationState): void {
    if (!this.canTransition(to)) {
      throw new Error(`无效的状态转换: ${this.state} → ${to}`);
    }
    const from = this.state;
    this.state = to;
    for (const listener of this.listeners) {
      listener(from, to);
    }
  }

  /** Force transition — allows ERROR from any state */
  forceError(): void {
    const from = this.state;
    this.state = 'error';
    for (const listener of this.listeners) {
      listener(from, 'error');
    }
  }

  reset(): void {
    const from = this.state;
    this.state = 'idle';
    for (const listener of this.listeners) {
      listener(from, 'idle');
    }
  }

  onChange(listener: (from: ConversationState, to: ConversationState) => void): void {
    this.listeners.push(listener);
  }
}
