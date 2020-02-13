const Type = cc.Enum({
  FLOOR: 0,
  WALL: 1,
  ITEM: 2,
  ENEMY: 3,
  STAIRS: 4,
});

const FLOOR_SPAN = 50;
const WALL_SPAN = 25;

cc.Class({
    extends: cc.Component,

    properties: {
      floorPrefab: {
        type: cc.Prefab,
        default: null,
      },

      wallPrefab: {
        type: cc.Prefab,
        default: null,
      },

      enemyPrefab: {
        type: cc.Prefab,
        default: null,
      },

      itemPrefab: {
        type: cc.Prefab,
        default: null,
      },

      stairsPrefab: {
        type: cc.Prefab,
        default: null,
      },

      _isTouch: false,
    },

    getNearlyPosition(position, span) {
      const rx = position.x % span;
      const ry = position.y % span;
      const x = (Math.trunc(position.x / span) + (rx >= span / 2 ? 1 : (rx < -span / 2 ? -1 : 0))) * span;
      const y = (Math.trunc(position.y / span) + (ry >= span / 2 ? 1 : (ry < -span / 2 ? -1 : 0))) * span;
      return new cc.Vec2(x, y);
    },

    isAlreadyPutObject(point, type) {
      const map = this.node.getChildByName("map");
      const children = map.getChildren().filter(x => x.type == type);
      for (let i = 0; i < children.length; i++) {
        if (children[i].x == point.x && children[i].y == point.y) {
          return true;
        }
      }
      return false;
    },

    generateFloor(point) {
      const map = this.node.getChildByName("map");
      const discretePoint = this.getNearlyPosition(map.convertToNodeSpace(point), FLOOR_SPAN);
      if (this.isAlreadyPutObject(discretePoint, Type.FLOOR)) {
        return;
      }

      const floor = cc.instantiate(this.floorPrefab);
      floor.type = Type.FLOOR;
      floor.position = discretePoint;
      map.addChild(floor);
    },

    onTapChangeFloorMode() {
      this.node.targetOff(this);

      this.node.on(cc.Node.EventType.TOUCH_START, (event) => {
        this._isTouch = true;
        this.generateFloor(event.getLocation());
      }, this);

      this.node.on(cc.Node.EventType.TOUCH_MOVE, (event) => {
        if (this._isTouch) {
          this.generateFloor(event.getLocation());
        }
      }, this);

      const touchEnd = (event) => {
        this._isTouch = false;
      }

      this.node.on(cc.Node.EventType.TOUCH_END, touchEnd, this);
      this.node.on(cc.Node.EventType.TOUCH_CANCEL, touchEnd, this);
    },

    getfloor(point) {
      const map = this.node.getChildByName("map");
      const children = map.getChildren().filter(x => x.type == Type.FLOOR);
      for (let i = 0; i < children.length; i++) {
        if (children[i].x == point.x && children[i].y == point.y) {
          return children[i];
        }
      }
      return null;
    },

    generateWall(point) {
      const map = this.node.getChildByName("map");
      const pointOnMap = map.convertToNodeSpace(point);
      const discretePoint = this.getNearlyPosition(pointOnMap, FLOOR_SPAN);
      const floor = this.getfloor(discretePoint);
      if (!floor) {
        return;
      }

      const angle = Math.atan2(pointOnMap.x - discretePoint.x, pointOnMap.y - discretePoint.y) * 180 / Math.PI;
      let addPoint = cc.v2(0, 0);
      let rotation = 0;
      if (angle > -45 && angle <= 45) {
        addPoint = cc.v2(0, WALL_SPAN);
        rotation = 0;
      } else if (angle > 45 && angle <= 135) {
        addPoint = cc.v2(WALL_SPAN, 0);
        rotation = -90;
      } else if (angle > -135 && angle <= -45) {
        addPoint = cc.v2(-WALL_SPAN, 0);
        rotation = 90;
      } else {
        addPoint = cc.v2(0, -WALL_SPAN);
        rotation = 180;
      }

      const position = discretePoint.add(addPoint);

      if (this.isAlreadyPutObject(position, Type.WALL)) {
        return;
      }

      const wall = cc.instantiate(this.wallPrefab);
      wall.type = Type.WALL;
      wall.position = position;
      wall.angle = rotation;
      map.addChild(wall);
    },

    onTapChangeWallMode() {
      this.node.targetOff(this);

      this.node.on(cc.Node.EventType.TOUCH_START, (event) => {
        this._isTouch = true;
        this.generateWall(event.getLocation());
      }, this);

      this.node.on(cc.Node.EventType.TOUCH_MOVE, (event) => {
        if (this._isTouch) {
          this.generateWall(event.getLocation());
        }
      }, this);

      const touchEnd = (event) => {
        this._isTouch = false;
      }

      this.node.on(cc.Node.EventType.TOUCH_END, touchEnd, this);
      this.node.on(cc.Node.EventType.TOUCH_CANCEL, touchEnd, this);
    },

    isAlreadyPutEnemy(floor) {
      const children = floor.getChildren().filter(x => x.type == Type.ENEMY);
      return children.length > 0;
    },

    generateEnemy(point) {
      const map = this.node.getChildByName("map");
      const pointOnMap = map.convertToNodeSpace(point);
      const discretePoint = this.getNearlyPosition(pointOnMap, FLOOR_SPAN);
      const floor = this.getfloor(discretePoint);
      if (!floor) {
        return;
      }

      if (this.isAlreadyPutEnemy(floor) || this.isAlreadyPutStairs(floor)) {
        return;
      }

      const enemy = cc.instantiate(this.enemyPrefab);
      enemy.type = Type.ENEMY;
      enemy.position = cc.v2(0, 0);

      if (this.isAlreadyPutItem(floor)) {
        enemy.setContentSize(10, 10);
      }
      
      floor.addChild(enemy);
    },

    onTapChangeEnemyMode() {
      this.node.targetOff(this);

      this.node.on(cc.Node.EventType.TOUCH_START, (event) => {
        this._isTouch = true;
        this.generateEnemy(event.getLocation());
      }, this);

      this.node.on(cc.Node.EventType.TOUCH_MOVE, (event) => {
        if (this._isTouch) {
          this.generateEnemy(event.getLocation());
        }
      }, this);

      const touchEnd = (event) => {
        this._isTouch = false;
      }

      this.node.on(cc.Node.EventType.TOUCH_END, touchEnd, this);
      this.node.on(cc.Node.EventType.TOUCH_CANCEL, touchEnd, this);
    },
    
    isAlreadyPutItem(floor) {
      const children = floor.getChildren().filter(x => x.type == Type.ITEM);
      return children.length > 0;
    },

    generateItem(point) {
      const map = this.node.getChildByName("map");
      const pointOnMap = map.convertToNodeSpace(point);
      const discretePoint = this.getNearlyPosition(pointOnMap, FLOOR_SPAN);
      const floor = this.getfloor(discretePoint);
      if (!floor) {
        return;
      }

      if (this.isAlreadyPutItem(floor) || this.isAlreadyPutStairs(floor)) {
        return;
      }

      const item = cc.instantiate(this.itemPrefab);
      item.type = Type.ITEM;
      item.position = cc.v2(0, 0);

      if (this.isAlreadyPutEnemy(floor)) {
        item.setContentSize(10, 10);
      }

      floor.addChild(item);
    },

    onTapChangeItemMode() {
      this.node.targetOff(this);

      this.node.on(cc.Node.EventType.TOUCH_START, (event) => {
        this._isTouch = true;
        this.generateItem(event.getLocation());
      }, this);

      this.node.on(cc.Node.EventType.TOUCH_MOVE, (event) => {
        if (this._isTouch) {
          this.generateItem(event.getLocation());
        }
      }, this);

      const touchEnd = (event) => {
        this._isTouch = false;
      }

      this.node.on(cc.Node.EventType.TOUCH_END, touchEnd, this);
      this.node.on(cc.Node.EventType.TOUCH_CANCEL, touchEnd, this);
    },

    isAlreadyPutStairs(floor) {
      const children = floor.getChildren().filter(x => x.type == Type.STAIRS);
      return children.length > 0;
    },

    generateStairs(point) {
      const map = this.node.getChildByName("map");
      const pointOnMap = map.convertToNodeSpace(point);
      const discretePoint = this.getNearlyPosition(pointOnMap, FLOOR_SPAN);
      const floor = this.getfloor(discretePoint);
      if (!floor) {
        return;
      }

      if (this.isAlreadyPutStairs(floor) || this.isAlreadyPutItem(floor) || this.isAlreadyPutEnemy(floor)) {
        return;
      }

      const stairs = cc.instantiate(this.stairsPrefab);
      stairs.type = Type.STAIRS;
      stairs.position = cc.v2(0, 0);
      floor.addChild(stairs);
    },

    onTapChangeStairsMode() {
      this.node.targetOff(this);

      this.node.on(cc.Node.EventType.TOUCH_START, (event) => {
        this._isTouch = true;
        this.generateStairs(event.getLocation());
      }, this);

      this.node.on(cc.Node.EventType.TOUCH_MOVE, (event) => {
        if (this._isTouch) {
          this.generateStairs(event.getLocation());
        }
      }, this);

      const touchEnd = (event) => {
        this._isTouch = false;
      }

      this.node.on(cc.Node.EventType.TOUCH_END, touchEnd, this);
      this.node.on(cc.Node.EventType.TOUCH_CANCEL, touchEnd, this);
    },
    // onLoad () {},

    start () {
      this._isTouch = false;
    },

    update (dt) {},
});
