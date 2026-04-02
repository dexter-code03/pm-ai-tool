/** Cross-app contracts (web + API). Align with Prisma / REST payloads. */

export type Role = 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: Role;
  orgId: string | null;
}

export interface PrdSectionDto {
  id: string;
  title: string;
  type: 'text' | 'list' | 'table';
  content?: string;
  items?: string[];
  rows?: string[][];
  headers?: string[];
}

export interface PrdDto {
  id: string;
  title: string;
  status: string;
  jiraKey: string | null;
  content: PrdSectionDto[];
}

export interface WireframeSpecScreenDto {
  name: string;
  description?: string;
  screenType?: 'modal' | 'page' | 'drawer' | 'sheet';
  components?: unknown[];
  navigation?: Record<string, string>;
}

export interface WireframeSpecDto {
  screens: WireframeSpecScreenDto[];
  version?: string;
}

export interface ApiErrorBody {
  error: string;
}
