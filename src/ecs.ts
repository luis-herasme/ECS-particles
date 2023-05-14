export type Entity = number;
type ComponentType = number;

class Component<T = unknown> {
  public readonly data: T;
  public readonly type: ComponentType;

  constructor(data: T, type: ComponentType) {
    this.data = data;
    this.type = type;
  }
}

type ComponentCreator<T> = {
  type: ComponentType;
  create: (data: T) => Component<T>;
};

export abstract class System {
  public abstract readonly requiredComponents: Set<ComponentType>;
  public abstract update(entities: Set<Entity>, ecs: ECS): void;
}

export class ECS {
  // Main state
  private systems = new Map<System, Set<Entity>>();
  private entities = new Map<Entity, Map<ComponentType, Component>>();
  private start: number = Date.now();
  public delta: number = 0;

  // Bookkeeping for entities
  private static nextEntityID = 0;
  private static nextComponentType: ComponentType = 0;

  private entitiesToDestroy = new Array<Entity>();

  static registerComponent<T>(): ComponentCreator<T> {
    const type = ECS.nextComponentType++;

    return {
      type,
      create: (data: T) => new Component<T>(data, type),
    };
  }

  // API: Entities
  public addEntity(): Entity {
    const entity = ECS.nextEntityID++;
    this.entities.set(entity, new Map<ComponentType, Component>());
    return entity;
  }

  public removeEntity(entity: Entity): void {
    this.entitiesToDestroy.push(entity);
  }

  // API: Components
  public addComponent<T>(entity: Entity, component: Component<T>): void {
    this.getComponents(entity).set(component.type, component);
    this.updateEntitySystems(entity);
  }

  public removeComponent(entity: Entity, component: Component): void {
    this.getComponents(entity).delete(component.type);
    this.updateEntitySystems(entity);
  }

  public getComponents(entity: Entity): Map<ComponentType, Component> {
    const entityComponents = this.entities.get(entity);

    if (!entityComponents) {
      throw new Error(`Entity ${entity} does not exist.`);
    }

    return entityComponents;
  }

  public getComponent<T>(
    entity: Entity,
    componentType: ComponentCreator<T>
  ): T {
    const component = this.getComponents(entity).get(componentType.type);

    if (!component) {
      throw new Error(
        `Entity ${entity} does not have component ${componentType.type}.`
      );
    }

    return component.data as T;
  }

  // API: Systems
  public addSystem(system: System): void {
    this.systems.set(system, new Set());

    for (const entity of this.entities.keys()) {
      this.updateEntitySystems(entity);
    }
  }

  public removeSystem(system: System): void {
    this.systems.delete(system);
  }

  public update(): void {
    const now = Date.now();
    this.delta = now - this.start;
    this.start = now;

    for (const [system, entities] of this.systems.entries()) {
      system.update(entities, this);
    }

    for (const entity of this.entitiesToDestroy) {
      this.destroyEntity(entity);
    }

    this.entitiesToDestroy = [];
  }

  // Private methods for doing internal state checks and mutations.
  private destroyEntity(entity: Entity): void {
    this.entities.delete(entity);
    for (const entities of this.systems.values()) {
      entities.delete(entity);
    }
  }

  private updateEntitySystems(entity: Entity): void {
    for (const [system, entities] of this.systems) {
      const entityComponents = this.getComponents(entity);

      // Check if the entity has all the required components for the system.
      let entityHasAllRequiredComponentsBySystem = true;

      for (const componentType of system.requiredComponents) {
        if (!entityComponents.has(componentType)) {
          entityHasAllRequiredComponentsBySystem = false;
          break;
        }
      }

      // Add or remove the entity from the system.
      if (entityHasAllRequiredComponentsBySystem) {
        entities.add(entity);
      } else {
        entities.delete(entity);
      }
    }
  }
}
