export interface TaskResultErr {
  err: true
  msg: string
}

export type TaskResultWithErr<T> = T | TaskResultErr
