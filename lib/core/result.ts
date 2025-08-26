/**
 * Result Pattern 用於統一錯誤處理
 */
export class Result<T, E = Error> {
  constructor(
    private success: boolean,
    private data?: T,
    private error?: E
  ) {}
  
  static ok<T>(data: T): Result<T> {
    return new Result(true, data);
  }
  
  static fail<E>(error: E): Result<never, E> {
    return new Result(false, undefined, error);
  }
  
  isOk(): boolean {
    return this.success;
  }
  
  isFail(): boolean {
    return !this.success;
  }
  
  getData(): T | undefined {
    return this.data;
  }
  
  getError(): E | undefined {
    return this.error;
  }
  
  map<U>(fn: (data: T) => U): Result<U, E> {
    if (this.isOk() && this.data) {
      return Result.ok(fn(this.data));
    }
    return Result.fail(this.error!);
  }
  
  flatMap<U>(fn: (data: T) => Result<U, E>): Result<U, E> {
    if (this.isOk() && this.data) {
      return fn(this.data);
    }
    return Result.fail(this.error!);
  }
}
