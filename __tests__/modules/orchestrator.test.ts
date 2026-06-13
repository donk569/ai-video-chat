import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateMachine } from '@/modules/orchestrator/state-machine';
import { PowerSaver } from '@/modules/orchestrator/power-saver';

describe('StateMachine', () => {
  let sm: StateMachine;

  beforeEach(() => { sm = new StateMachine(); });

  it('starts in idle state', () => {
    expect(sm.getState()).toBe('idle');
  });

  it('transitions idle → listening', () => {
    sm.transition('listening');
    expect(sm.getState()).toBe('listening');
  });

  it('transitions listening → thinking', () => {
    sm.transition('listening');
    sm.transition('thinking');
    expect(sm.getState()).toBe('thinking');
  });

  it('transitions thinking → speaking', () => {
    sm.transition('listening');
    sm.transition('thinking');
    sm.transition('speaking');
    expect(sm.getState()).toBe('speaking');
  });

  it('transitions speaking → idle', () => {
    sm.transition('listening');
    sm.transition('thinking');
    sm.transition('speaking');
    sm.transition('idle');
    expect(sm.getState()).toBe('idle');
  });

  it('throws on invalid transition', () => {
    expect(() => sm.transition('speaking')).toThrow('无效的状态转换');
  });

  it('forceError works from any state', () => {
    sm.transition('listening');
    sm.forceError();
    expect(sm.getState()).toBe('error');
  });

  it('error can reset to idle', () => {
    sm.forceError();
    sm.transition('idle');
    expect(sm.getState()).toBe('idle');
  });

  it('reset returns to idle', () => {
    sm.transition('listening');
    sm.transition('thinking');
    sm.reset();
    expect(sm.getState()).toBe('idle');
  });

  it('onChange listener fires on transition', () => {
    const listener = vi.fn();
    sm.onChange(listener);
    sm.transition('listening');
    expect(listener).toHaveBeenCalledWith('idle', 'listening');
  });
});

describe('PowerSaver', () => {
  it('starts in active mode', () => {
    const ps = new PowerSaver(100);
    expect(ps.isActive()).toBe(true);
  });

  it('activity resets idle timer', () => {
    vi.useFakeTimers();
    const target = { setLowPower: vi.fn() };
    const ps = new PowerSaver(100);
    ps.setTarget(target);
    ps.activity();
    vi.advanceTimersByTime(50);
    ps.activity(); // reset
    vi.advanceTimersByTime(50); // only 50ms since last activity, not 100
    expect(target.setLowPower).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('enters low power after idle timeout', () => {
    vi.useFakeTimers();
    const target = { setLowPower: vi.fn() };
    const ps = new PowerSaver(100);
    ps.setTarget(target);
    ps.activity();
    vi.advanceTimersByTime(150); // past timeout
    expect(target.setLowPower).toHaveBeenCalledWith(true);
    vi.useRealTimers();
  });

  it('activity wakes from low power', () => {
    vi.useFakeTimers();
    const target = { setLowPower: vi.fn() };
    const ps = new PowerSaver(100);
    ps.setTarget(target);
    ps.activity();
    vi.advanceTimersByTime(150);
    expect(target.setLowPower).toHaveBeenCalledWith(true);

    ps.activity(); // wake
    expect(target.setLowPower).toHaveBeenCalledWith(false);
    vi.useRealTimers();
  });

  it('onWake callback fires', () => {
    vi.useFakeTimers();
    const target = { setLowPower: vi.fn() };
    const callback = vi.fn();
    const ps = new PowerSaver(100);
    ps.setTarget(target);
    ps.onWake(callback);
    ps.activity();
    vi.advanceTimersByTime(150); // enter low power
    ps.activity(); // wake
    expect(callback).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
