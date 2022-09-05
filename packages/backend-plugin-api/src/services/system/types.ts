/*
 * Copyright 2022 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * TODO
 *
 * @public
 */
export type ServiceRef<
  TService,
  TScope extends 'root' | 'plugin' = 'root' | 'plugin',
> = {
  id: string;

  /**
   * I WILL FILL THIS IN OR EAT MY SHOE
   */
  scope: TScope;

  /**
   * Utility for getting the type of the service, using `typeof serviceRef.T`.
   * Attempting to actually read this value will result in an exception.
   */
  T: TService;

  toString(): string;

  $$ref: 'service';
};

// /**
//  * @internal
//  */
// export type InternalServiceRef<T> = ServiceRef<T> & {
//   /**
//    * The default factory that will be used to create service
//    * instances if no other factory is provided.
//    */
//   __defaultFactory?: (
//     service: ServiceRef<T>,
//   ) => Promise<ServiceFactory<T> | (() => ServiceFactory<T>)>;
// };

/** @public */
export type TypesToServiceRef<T> = { [key in keyof T]: ServiceRef<T[key]> };

/** @public */
export type DepsToDepFactories<T> = {
  [key in keyof T]: (pluginId: string) => Promise<T[key]>;
};

/** @public */
export type FactoryFunc<Impl> = (pluginId: string) => Promise<Impl>;

/** @public */
export type ServiceFactory<TService = unknown> = {
  service: ServiceRef<TService>;
  deps: { [key in string]: ServiceRef<unknown> };
  factory(deps: { [key in string]: unknown }): Promise<FactoryFunc<TService>>;
};

/**
 * @public
 */
export function createServiceRef<T, TScope extends 'root' | 'plugin'>(options: {
  id: string;
  scope: TScope;
  defaultFactory?: (
    service: ServiceRef<T>,
  ) => Promise<ServiceFactory<T> | (() => ServiceFactory<T>)>;
}): ServiceRef<T, TScope> {
  const { id, scope, defaultFactory } = options;
  return {
    id,
    scope,
    get T(): T {
      throw new Error(`tried to read ServiceRef.T of ${this}`);
    },
    toString() {
      return `serviceRef{${options.id}}`;
    },
    $$ref: 'service', // TODO: declare
    __defaultFactory: defaultFactory,
  } as ServiceRef<T, TScope> & {
    /**
     * The default factory that will be used to create service
     * instances if no other factory is provided.
     */
    __defaultFactory?: (
      service: ServiceRef<T>,
    ) => Promise<ServiceFactory<T> | (() => ServiceFactory<T>)>;
  };
}

type ServiceRefScope<T extends ServiceRef<unknown>> = T extends {
  scope?: infer TScope;
}
  ? TScope
  : never;

const ref1 = createServiceRef<string>({ id: 'foo', scope: 'plugin' });
const ref2 = createServiceRef<string>({ id: 'foo', scope: 'root' });

createServiceFactory({
  service: ref1,
  deps: {},
  async factory() {
    return async () => 'foo';
  },
});
createServiceFactory({
  service: ref2,
  deps: {},
  async factory() {
    return 'foo';
  },
});

type Ref1Scope = ServiceRefScope<typeof ref1>;
type Ref2Scope = ServiceRefScope<typeof ref2>;

/**
 * @public
 */
export function createServiceFactory<
  TService,
  TScope extends 'root' | 'plugin',
  TImpl extends TService,
  TDeps extends { [name in string]: unknown },
  TOpts extends { [name in string]: unknown } | undefined = undefined,
>(factory: {
  service: ServiceRef<TService, TScope>;
  deps: TypesToServiceRef<TDeps>;
  factory(
    deps: DepsToDepFactories<TDeps>,
    options: TOpts,
  ): TScope extends 'root' ? Promise<TImpl> : Promise<FactoryFunc<TImpl>>;
}): undefined extends TOpts
  ? (options?: TOpts) => ServiceFactory<TService>
  : (options: TOpts) => ServiceFactory<TService> {
  return (options?: TOpts) => ({
    service: factory.service,
    deps: factory.deps,
    factory(deps: DepsToDepFactories<TDeps>) {
      return factory.factory(deps, options!);
    },
  });
}
