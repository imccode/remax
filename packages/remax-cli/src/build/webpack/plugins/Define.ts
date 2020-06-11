import { ReplaceSource } from 'webpack-sources';
import { Compiler, compilation } from 'webpack';
import { Options } from '@remax/types';
import { appEvents, pageEvents, hostComponents } from '@remax/macro';
import { slash } from '@remax/shared';
import getModules from '../../utils/modules';
import { getPages } from '../../../getEntries';
import API from '../../../API';

const PLUGIN_NAME = 'RemaxDefinePlugin';

type Events = Set<string>;

export const pageClassEvents = new Map<string, Events>();
export const appClassEvents = new Map<string, Events>();

export default class DefinePlugin {
  remaxOptions: Options;
  api: API;

  constructor(options: Options, api: API) {
    this.remaxOptions = options;
    this.api = api;
  }

  apply(compiler: Compiler) {
    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation: compilation.Compilation) => {
      compilation.hooks.optimizeChunkAssets.tapAsync(PLUGIN_NAME, (chunks, callback) => {
        compilation.chunkGroups.forEach(group => {
          group.chunks.forEach((chunk: any) => {
            const chunkPath = chunk.name + '.js';
            const source = new ReplaceSource(compilation.assets[chunkPath]);

            const startB = this.getReplaceStartIndex(source, /__REMAX_APP_EVENTS__/);
            const startC = this.getReplaceStartIndex(source, /__REMAX_PAGE_EVENTS__/);
            const startD = this.getReplaceStartIndex(source, /__REMAX_HOST_COMPONENTS__/);

            if (startB) {
              source.replace(startB, startB + 19, this.stringifyAppEvents());
            }
            if (startC) {
              source.replace(startC, startC + 20, this.stringifyPageEvents(compilation));
            }

            if (startD) {
              source.replace(startD, startD + 24, this.stringifyHostComponents());
            }
            compilation.assets[chunkPath] = source;
          });
        });

        callback();
      });
    });
  }

  getReplaceStartIndex(source: ReplaceSource, regExp: RegExp) {
    return regExp.exec(source.source())?.index;
  }

  stringifyPageEvents(compilation: compilation.Compilation) {
    const events: any = {};

    getPages(this.remaxOptions, this.api).map(page => {
      const chunk = compilation.chunks.find(c => {
        return c.name === page.name;
      });

      // TODO: 应该有更好的获取 modules 的方式？
      const modules = getModules(chunk);

      events[page.name] = Array.from(
        new Set(
          modules
            .reduce<string[]>((acc, cur) => {
              return [...acc, ...(pageEvents.get(slash(cur)) || []), ...(pageClassEvents.get(slash(cur)) || [])];
            }, [])
            .sort()
        )
      );
    });

    return JSON.stringify(events, null, 2);
  }

  stringifyAppEvents() {
    let events: string[] = [];
    for (const key of appEvents.keys()) {
      // 这里 get 不可能为空
      events = events.concat(Array.from(appEvents.get(key)!));
    }

    for (const key of appClassEvents.keys()) {
      // 这里 get 不可能为空
      events = events.concat(Array.from(appClassEvents.get(key)!));
    }

    return JSON.stringify(Array.from(new Set(events.sort())), null, 2);
  }

  stringifyHostComponents() {
    return JSON.stringify(
      [...hostComponents.keys()].reduce((obj, key) => {
        obj[key] = {
          alias: hostComponents.get(key)?.alias || {},
        };

        return obj;
      }, {} as any),
      null,
      2
    );
  }
}
