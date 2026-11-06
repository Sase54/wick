// Object pool: reuses objects instead of allocating new ones every shot/particle.
export class Pool {
  constructor(create, initial = 64) {
    this.create = create;
    this.free = [];
    this.live = [];
    for (let i = 0; i < initial; i++) this.free.push(create());
  }

  spawn() {
    const o = this.free.length ? this.free.pop() : this.create();
    this.live.push(o);
    return o;
  }

  // Calls fn on every live object; returning false releases it back to the pool.
  sweep(fn) {
    const live = this.live;
    for (let i = 0; i < live.length; ) {
      const o = live[i];
      if (fn(o) === false) {
        live[i] = live[live.length - 1];
        live.pop();
        this.free.push(o);
      } else {
        i++;
      }
    }
  }

  clear() {
    while (this.live.length) this.free.push(this.live.pop());
  }

  get count() { return this.live.length; }
}
