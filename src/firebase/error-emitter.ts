import { EventEmitter } from 'events';
import { FirestorePermissionError } from './errors';

type Events = {
  'permission-error': (error: FirestorePermissionError) => void;
};

// Extend EventEmitter with our typed events
declare interface TypedEventEmitter<TEvents extends Record<string, any>> {
  on<TEvent extends keyof TEvents>(event: TEvent, listener: TEvents[TEvent]): this;
  off<TEvent extends keyof TEvents>(event: TEvent, listener: TEvents[TEvent]): this;
  emit<TEvent extends keyof TEvents>(event: TEvent, ...args: Parameters<TEvents[TEvent]>): boolean;
}

class TypedEventEmitter<TEvents extends Record<string, any>> extends EventEmitter {}

export const errorEmitter = new TypedEventEmitter<Events>();
