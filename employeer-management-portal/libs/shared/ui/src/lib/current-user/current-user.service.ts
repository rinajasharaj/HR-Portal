import { Injectable, computed, signal } from '@angular/core';

export type UserRole = 'employee' | 'manager';

const ROLE_EVENT = 'hr-portal:role-change';
const ROLE_KEY = '__hrPortalRole';

function readInitialRole(): UserRole {
  return (globalThis as Record<string, unknown>)[ROLE_KEY] === 'manager'
    ? 'manager'
    : 'employee';
}

/**
 * Mock "who am I" service. Lives in shared so every domain (and the shell)
 * can read the current user + role without depending on another domain.
 *
 * With Native Federation each remote bundles its own copy of this class, so a
 * plain signal wouldn't be shared between the shell and the remotes. We keep the
 * role in a same-realm window event bus (+ a global for late-created instances)
 * so the shell's role toggle also drives the leave remote's approval queue.
 */
@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  readonly userId = signal<string>('e2');
  readonly userName = signal<string>('Ana Marku');
  readonly role = signal<UserRole>(readInitialRole());

  readonly isManager = computed(() => this.role() === 'manager');

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener(ROLE_EVENT, (event: Event) => {
        const next = (event as CustomEvent<UserRole>).detail;
        if (next && next !== this.role()) {
          this.role.set(next);
        }
      });
    }
  }

  toggleRole(): void {
    this.setRole(this.role() === 'employee' ? 'manager' : 'employee');
  }

  setRole(role: UserRole): void {
    this.role.set(role);
    if (typeof window !== 'undefined') {
      (globalThis as Record<string, unknown>)[ROLE_KEY] = role;
      window.dispatchEvent(new CustomEvent<UserRole>(ROLE_EVENT, { detail: role }));
    }
  }
}
