import { Painter } from "./Painter";
import { ECS, System, Entity } from "./ecs";

const painter = new Painter();
const colors = ["red", "green", "yellow"] as const;

type Vector = {
  x: number;
  y: number;
};

type Position = Vector;
type Velocity = Vector;
type Color = "red" | "green" | "yellow";

const PositionComponent = ECS.registerComponent<Position>();
const VelocityComponent = ECS.registerComponent<Velocity>();
const ColorComponent = ECS.registerComponent<Color>();

class RenderSystem extends System {
  public readonly requiredComponents = new Set([
    PositionComponent.type,
    ColorComponent.type,
  ]);

  public update(entities: Set<Entity>, ecs: ECS) {
    painter.clear();

    for (const entity of entities) {
      const position = ecs.getComponent(entity, PositionComponent);
      const color = ecs.getComponent(entity, ColorComponent);
      painter.circle(position.x, position.y, 3, color);
    }
  }
}

const ecs = new ECS();
const renderSystem = new RenderSystem();
ecs.addSystem(renderSystem);

class PhysicsSystem extends System {
  public readonly requiredComponents = new Set([
    PositionComponent.type,
    VelocityComponent.type,
    ColorComponent.type,
  ]);

  private mapWidth: number = window.innerWidth;
  private mapHeight: number = window.innerHeight;

  private collideWithMap(position: Position) {
    if (position.x <= 0) {
      position.x += this.mapWidth;
    }

    if (position.x >= this.mapWidth) {
      position.x -= this.mapWidth;
    }

    if (position.y <= 0) {
      position.y += this.mapHeight;
    }

    if (position.y >= this.mapHeight) {
      position.y -= this.mapHeight;
    }
  }

  public update(entities: Set<Entity>, ecs: ECS) {
    for (const entity of entities) {
      const position = ecs.getComponent(entity, PositionComponent);
      const velocity = ecs.getComponent(entity, VelocityComponent);
      const color = ecs.getComponent(entity, ColorComponent);
      const force: Vector = { x: 0, y: 0 };

      for (const otherEntity of entities) {
        if (entity === otherEntity) continue;

        const otherPosition = ecs.getComponent(otherEntity, PositionComponent);
        const otherColor = ecs.getComponent(otherEntity, ColorComponent);

        const dxSign = Math.sign(otherPosition.x - position.x);
        const dySign = Math.sign(otherPosition.y - position.y);

        let dx = Math.abs(otherPosition.x - position.x);
        let dy = Math.abs(otherPosition.y - position.y);

        dx = Math.min(dx, this.mapWidth - dx);
        dy = Math.min(dy, this.mapHeight - dy);

        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 20 && distance < 80) {
          const rule = RULES.find(
            (rule) => rule.from === color && rule.to === otherColor
          );

          if (rule) {
            force.x += ((dxSign * dx) / distance) * rule.magnitude * 60;
            force.y += ((dySign * dy) / distance) * rule.magnitude * 60;
          }
        }
      }

      velocity.x = (velocity.x + force.x) * 0.5;
      velocity.y = (velocity.y + force.y) * 0.5;

      position.x += velocity.x / ecs.delta;
      position.y += velocity.y / ecs.delta;

      this.collideWithMap(position);
    }
  }
}

const physicsSystem = new PhysicsSystem();

ecs.addSystem(physicsSystem);

type Rule = {
  from: Color;
  to: Color;
  magnitude: number;
};

const RULES: Rule[] = [];

for (let i = 0; i < 500; i++) {
  const entity = ecs.addEntity();

  ecs.addComponent(
    entity,
    PositionComponent.create({
      x: window.innerWidth * Math.random(),
      y: window.innerHeight * Math.random(),
    })
  );

  ecs.addComponent(
    entity,
    VelocityComponent.create({
      x: 0,
      y: 0,
    })
  );

  ecs.addComponent(
    entity,
    ColorComponent.create(colors[Math.floor(Math.random() * colors.length)])
  );
}

function gameLoop() {
  ecs.update();
  requestAnimationFrame(gameLoop);
}

function main() {
  const controls = document.getElementById("controls")!;

  for (const color of colors) {
    for (const otherColor of colors) {
      const rule = RULES.find(
        (rule) => rule.from === color && rule.to === otherColor
      );

      if (!rule) {
        RULES.push({
          from: color,
          to: otherColor,
          magnitude: 0,
        });
      }
    }
  }

  for (const rule of RULES) {
    const { from: color, to: otherColor } = rule;

    const label = document.createElement("label");
    label.innerText = `${color} -> ${otherColor} (${rule.magnitude})`;
    label.style.display = "block";
    label.style.marginBottom = "0.5rem";
    label.style.marginTop = "1.5rem";
    controls.appendChild(label);

    const input = document.createElement("input");
    input.type = "range";
    input.min = "-2";
    input.max = "2";
    input.step = "0.01";
    input.style.width = "100%";
    input.value = rule.magnitude.toString();
    input.addEventListener("input", () => {
      rule.magnitude = parseFloat(input.value);
      label.innerText = `${color} -> ${otherColor} (${rule.magnitude})`;
    });
    controls.appendChild(input);
  }

  requestAnimationFrame(gameLoop);
}

main();
