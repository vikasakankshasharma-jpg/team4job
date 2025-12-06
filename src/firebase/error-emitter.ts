import mitt, { Emitter } from 'mitt';
import { FirestorePermissionError } from './errors';

type Events = {
  'permission-error': FirestorePermissionError;
};

export const errorEmitter: Emitter<Events> = mitt<Events>();
