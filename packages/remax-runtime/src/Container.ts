import VNode, { RawNode } from './VNode';
import { generate } from './instanceId';
import { FiberRoot } from 'react-reconciler';
import nativeEffector from './nativeEffect';

interface SpliceUpdate {
  path: string;
  start: number;
  id: number;
  deleteCount: number;
  items: RawNode[];
  children?: RawNode[];
  type: 'splice';
}

interface SetUpdate {
  path: string;
  name: string;
  value: any;
  type: 'set';
}

export default class Container {
  context: any;
  root: VNode;
  updateQueue: Array<SpliceUpdate | SetUpdate> = [];
  _rootContainer?: FiberRoot;
  stopUpdate?: boolean;
  rendered = false;

  constructor(context: any) {
    this.context = context;

    this.root = new VNode({
      id: generate(),
      type: 'root',
      container: this,
    });
    this.root.mounted = true;
  }

  requestUpdate(update: SpliceUpdate | SetUpdate, immediately?: boolean) {
    if (immediately) {
      this.updateQueue.push(update);
      this.applyUpdate();
    } else {
      if (this.updateQueue.length === 0) {
        Promise.resolve().then(() => this.applyUpdate());
      }
      this.updateQueue.push(update);
    }
  }

  applyUpdate() {
    if (this.stopUpdate) {
      return;
    }

    const startTime = new Date().getTime();

    if (typeof this.context.$spliceData === 'function') {
      let $batchedUpdates = (callback: Function) => {
        callback();
      };

      if (typeof this.context.$batchedUpdates === 'function') {
        $batchedUpdates = this.context.$batchedUpdates;
      }

      $batchedUpdates(() => {
        this.updateQueue.map((update, index) => {
          let callback = undefined;
          if (index + 1 === this.updateQueue.length) {
            callback = () => {
              nativeEffector.run();
              /* istanbul ignore next */
              if (__REMAX_DEBUG__) {
                console.log(`setData => 回调时间：${new Date().getTime() - startTime}ms`);
              }
            };
          }

          if (update.type === 'splice') {
            this.context.$spliceData(
              {
                [update.path + '.children']: [update.start, update.deleteCount, ...update.items],
              },
              callback
            );
          }

          if (update.type === 'set') {
            this.context.setData(
              {
                [update.path + '.' + update.name]: update.value,
              },
              callback
            );
          }
        });
      });

      this.updateQueue = [];

      return;
    }

    const updatePayload = this.updateQueue.reduce<{ [key: string]: any }>((acc, update) => {
      if (update.type === 'splice') {
        const item = {
          ...acc,
          [update.path + '.nodes.' + update.id]: update.items[0] || null,
        };

        if (update.children) {
          item[update.path + '.children'] = (update.children || []).map(c => c.id);
        }

        return item;
      }

      return {
        ...acc,
        [update.path + '.' + update.name]: update.value,
      };
    }, {});

    this.context.setData(updatePayload, () => {
      nativeEffector.run();
      /* istanbul ignore next */
      if (__REMAX_DEBUG__) {
        console.log(`setData => 回调时间：${new Date().getTime() - startTime}ms`, updatePayload);
      }
    });

    this.updateQueue = [];
  }

  clearUpdate() {
    this.stopUpdate = true;
  }

  createCallback(name: string, fn: Function) {
    this.context[name] = fn;
  }

  appendChild(child: VNode) {
    this.root.appendChild(child, true);
  }

  removeChild(child: VNode) {
    this.root.removeChild(child, true);
  }

  insertBefore(child: VNode, beforeChild: VNode) {
    this.root.insertBefore(child, beforeChild, true);
  }
}
