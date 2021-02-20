import {IOGate, Pipe} from '@ziqquratu/pipe';

export abstract class Transform<In = any, Out = In> {
  public abstract apply(gen: AsyncGenerator<In>): AsyncGenerator<Out>;
}

export class PipeTransform<In = any, Out = In> extends Transform<In, Out> {
  public constructor(private pipe: Pipe<In, Out>) { super(); }

  public apply(source: AsyncGenerator<In>) {
    const pipe = this.pipe;

    async function* gen() {
      for await (const data of source) {
        yield await pipe(data);
      }
    }
    return gen();
  }
}

export class FilterTransform<T> extends Transform<T> {
  public constructor(private test: Pipe<T, boolean>) { super(); }

  public apply(source: AsyncGenerator<T>) {
    const test = this.test;

    async function* gen() {
      for await (const data of source) {
        if (await test(data)) {
          yield data;
        }
      }
    }
    return gen();
  }
}

export class ArrayBundleTransform<T> extends Transform<T, T[]> {
  public apply(source: AsyncGenerator<T>) {
    async function* gen() {
      const list: T[] = []
      for await (const data of source) {
        list.push(data);
      }
      yield list;
    }
    return gen();
  }
}

export function pipe<In = any, Out = any>(pipe: Pipe<In, Out>) { return new PipeTransform(pipe); }

export const chain = (pipes: Pipe[]): Pipe => async (data: any) => {
  let res = data;
  for (const pipe of pipes) {
    res = await pipe(res);
  }
  return res;
};

export const onKey = (key: string, ...pipes: Pipe[]) => {
  const pipe = chain(pipes);
  return (async (data: any) => Object.assign(data, {[key]: await pipe(data[key])})) as Pipe
}

export const transformInput = (transforms: IOGate<Pipe>[], key?: string): Transform => {
  const p = chain(transforms.map(t => t.input));
  return pipe(key ? onKey(key, p) : p);
}

export const transformOutput = (transforms: IOGate<Pipe>[], key?: string): Transform => {
  const p = chain(transforms.map(t => t.output).reverse());
  return pipe(key ? onKey(key, p) : p);
}

export function filter<T>(test: Pipe<T, boolean>) { return new FilterTransform<T>(test); }

export function toArrayBundle<T>() { return new ArrayBundleTransform<T>(); }