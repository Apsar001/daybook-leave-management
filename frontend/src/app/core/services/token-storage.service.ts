import { Injectable } from '@angular/core';
import { LoginResponse, RefreshResponse, User } from '../models/api.models';

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User | null;
  remember: boolean;
}

const SESSION_KEY = 'leaveflow.session';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  getSession(): StoredSession | null {
    return this.read(localStorage) ?? this.read(sessionStorage);
  }

  getAccessToken(): string | null {
    return this.getSession()?.accessToken ?? null;
  }

  getRefreshToken(): string | null {
    return this.getSession()?.refreshToken ?? null;
  }

  getUser(): User | null {
    return this.getSession()?.user ?? null;
  }

  saveLogin(response: LoginResponse, remember: boolean): void {
    this.save({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresIn: response.expiresIn,
      user: response.user,
      remember,
    });
  }

  saveRefresh(response: RefreshResponse): void {
    const current = this.getSession();
    if (!current) {
      return;
    }
    this.save({
      ...current,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresIn: response.expiresIn,
    });
  }

  updateUser(user: User): void {
    const current = this.getSession();
    if (!current) {
      return;
    }
    this.save({ ...current, user });
  }

  clear(): void {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }

  private save(session: StoredSession): void {
    this.clear();
    const target = session.remember ? localStorage : sessionStorage;
    target.setItem(SESSION_KEY, JSON.stringify(session));
  }

  private read(storage: Storage): StoredSession | null {
    const raw = storage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<StoredSession>;
      if (!parsed.accessToken || !parsed.refreshToken) {
        return null;
      }
      return {
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
        expiresIn: typeof parsed.expiresIn === 'number' ? parsed.expiresIn : 0,
        user: parsed.user ?? null,
        remember: Boolean(parsed.remember),
      };
    } catch {
      storage.removeItem(SESSION_KEY);
      return null;
    }
  }
}
