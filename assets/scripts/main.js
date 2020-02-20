const Type = cc.Enum({
  FLOOR: 0,
  WALL: 1,
  ITEM: 2,
  ENEMY: 3,
  STAIRS: 4,
  TRAP: 5,
});

const FLOOR_SPAN = 50;
const WALL_SPAN = 25;

const isDebug = function () {
  return cc.game.config.debugMode <= 1;
};

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

      trapPrefab: {
        type: cc.Prefab,
        default: null,
      },

      detailPanelPrefab: {
        type: cc.Prefab,
        default: null,
      },

      _isTouch: false,
      _fileName: "map",
      _cannotAction: false,
    },

    setStateLabel(state) {
      this.node.getChildByName("stateLabel").getComponent(cc.Label).string = state;
    },

    onTapChangeMoveMode() {
      if (this._cannotAction) {
        return;
      }

      this.node.targetOff(this);
      this.subUIDisabled();
      this.setStateLabel("move");
      
      this.node.getChildByName("positionResetButton").active = true;

      let prevPoint = null;
      const map = this.node.getChildByName("map");

      this.node.on(cc.Node.EventType.TOUCH_START, (event) => {
        if (this._cannotAction) {
          return;
        }
        this._isTouch = true;
        prevPoint = event.getLocation();
      }, this);

      this.node.on(cc.Node.EventType.TOUCH_MOVE, (event) => {
        if (this._isTouch && prevPoint) {
          const nowPoint = event.getLocation();
          map.position = map.position.add(nowPoint.sub(prevPoint));
          prevPoint = nowPoint;
        }
      }, this);

      const touchEnd = (event) => {
        this._isTouch = false;
        prevPoint = null;
      }

      this.node.on(cc.Node.EventType.TOUCH_END, touchEnd, this);
      this.node.on(cc.Node.EventType.TOUCH_CANCEL, touchEnd, this);
    },

    onTapMoveReset() {
      this.node.targetOff(this);
      this.subUIDisabled();
      const map = this.node.getChildByName("map");
      map.position = cc.v2(0, 0);
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
      if (this._cannotAction) {
        return;
      }

      this.node.targetOff(this);
      this.subUIDisabled();
      this.setStateLabel("floor");

      this.node.on(cc.Node.EventType.TOUCH_START, (event) => {
        if (this._cannotAction) {
          return;
        }

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
        this.save();
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

    getWallPositionAndAngle(pointOnMap, discretePoint) {
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

      return {
        position: discretePoint.add(addPoint),
        angle: rotation,
      }
    },

    generateWall(point) {
      const map = this.node.getChildByName("map");
      const pointOnMap = map.convertToNodeSpace(point);
      const discretePoint = this.getNearlyPosition(pointOnMap, FLOOR_SPAN);
      const floor = this.getfloor(discretePoint);
      if (!floor) {
        return;
      }

      const positionAndAngle = this.getWallPositionAndAngle(pointOnMap, discretePoint);
      if (this.isAlreadyPutObject(positionAndAngle.position, Type.WALL)) {
        return;
      }

      const wall = cc.instantiate(this.wallPrefab);
      wall.type = Type.WALL;
      wall.position = positionAndAngle.position;
      wall.angle = positionAndAngle.angle;
      map.addChild(wall);
    },

    onTapChangeWallMode() {
      if (this._cannotAction) {
        return;
      }

      this.node.targetOff(this);
      this.subUIDisabled();
      this.setStateLabel("wall");

      this.node.on(cc.Node.EventType.TOUCH_START, (event) => {
        if (this._cannotAction) {
          return;
        }
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
        this.save();
      }

      this.node.on(cc.Node.EventType.TOUCH_END, touchEnd, this);
      this.node.on(cc.Node.EventType.TOUCH_CANCEL, touchEnd, this);
    },

    isAlreadyPutTypeOnFloor(floor, types) {
      const children = floor.getChildren().filter(x => types.indexOf(x.type) >= 0);
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

      if (this.isAlreadyPutTypeOnFloor(floor, [Type.ENEMY, Type.STAIRS])) {
        return;
      }

      const enemy = cc.instantiate(this.enemyPrefab);
      enemy.type = Type.ENEMY;
      enemy.position = cc.v2(0, 0);

      if (this.isAlreadyPutTypeOnFloor(floor, [Type.ITEM])) {
        enemy.setContentSize(10, 10);
      }
      
      floor.addChild(enemy);
      this.showDetailView(floor);
    },

    onTapChangeEnemyMode() {
      if (this._cannotAction) {
        return;
      }

      this.node.targetOff(this);
      this.subUIDisabled();
      this.setStateLabel("enemy");

      this.node.on(cc.Node.EventType.TOUCH_START, (event) => {
        if (this._cannotAction) {
          return;
        }

        this._isTouch = true;
        this.generateEnemy(event.getLocation());
      }, this);
    },

    generateItem(point) {
      const map = this.node.getChildByName("map");
      const pointOnMap = map.convertToNodeSpace(point);
      const discretePoint = this.getNearlyPosition(pointOnMap, FLOOR_SPAN);
      const floor = this.getfloor(discretePoint);
      if (!floor) {
        return;
      }

      if (this.isAlreadyPutTypeOnFloor(floor, [Type.ITEM, Type.STAIRS])) {
        return;
      }

      const item = cc.instantiate(this.itemPrefab);
      item.type = Type.ITEM;
      item.position = cc.v2(0, 0);

      if (this.isAlreadyPutTypeOnFloor(floor, [Type.ENEMY])) {
        item.setContentSize(10, 10);
      }

      floor.addChild(item);
      this.showDetailView(floor);
    },

    onTapChangeItemMode() {
      if (this._cannotAction) {
        return;
      }

      this.node.targetOff(this);
      this.subUIDisabled();
      this.setStateLabel("item");

      this.node.on(cc.Node.EventType.TOUCH_START, (event) => {
        if (this._cannotAction) {
          return;
        }
        this.generateItem(event.getLocation());
      }, this);
    },

    generateStairs(point) {
      const map = this.node.getChildByName("map");
      const pointOnMap = map.convertToNodeSpace(point);
      const discretePoint = this.getNearlyPosition(pointOnMap, FLOOR_SPAN);
      const floor = this.getfloor(discretePoint);
      if (!floor) {
        return;
      }

      if (this.isAlreadyPutTypeOnFloor(floor, [Type.STAIRS, Type.ITEM, Type.ENEMY])) {
        return;
      }

      const stairs = cc.instantiate(this.stairsPrefab);
      stairs.type = Type.STAIRS;
      stairs.position = cc.v2(0, 0);
      floor.addChild(stairs);
      this.showDetailView(floor);
    },

    onTapChangeStairsMode() {
      if (this._cannotAction) {
        return;
      }

      this.node.targetOff(this);
      this.subUIDisabled();
      this.setStateLabel("stairs");

      this.node.on(cc.Node.EventType.TOUCH_START, (event) => {
        if (this._cannotAction) {
          return;
        }
        this.generateStairs(event.getLocation());
      }, this);
    },

    generateTrap(point) {
      const map = this.node.getChildByName("map");
      const pointOnMap = map.convertToNodeSpace(point);
      const discretePoint = this.getNearlyPosition(pointOnMap, FLOOR_SPAN);
      const floor = this.getfloor(discretePoint);
      if (!floor) {
        return;
      }

      if (this.isAlreadyPutTypeOnFloor(floor, [Type.STAIRS, Type.ITEM, Type.ENEMY])) {
        return;
      }

      const trap = cc.instantiate(this.trapPrefab);
      trap.type = Type.TRAP;
      trap.position = cc.v2(0, 0);
      floor.addChild(trap);
      this.showDetailView(floor);
    },

    onTapChangeTrapMode() {
      if (this._cannotAction) {
        return;
      }

      this.node.targetOff(this);
      this.subUIDisabled();
      this.setStateLabel("Trap");

      this.node.on(cc.Node.EventType.TOUCH_START, (event) => {
        if (this._cannotAction) {
          return;
        }
        this.generateTrap(event.getLocation());
      }, this);
    },

    convertJson() {
      const map = this.node.getChildByName("map");
      const func = x => {
        return {
          id: x.interId,
          type: x.type,
          position: x.position,
          angle: x.angle,
          children: x.getChildren().map(func),
        }
      }
      const children = map.getChildren().map(func);
      return JSON.stringify(children);
    },

    onTapDownload() {
      if (this._cannotAction) {
        return;
      }

      this.save();
      let json = this.convertJson();

      if (!isDebug()) {
        json = Base64.toBase64(RawDeflate.deflate(Base64.utob(json)));
      }

      const saveWindow = this.node.getChildByName("saveWindow");
      saveWindow.active = true;
      const webView = saveWindow.getComponent(cc.WebView);
      webView.url = "https://viviria.github.io/JsonDownloader/?name=" + this._fileName + "&data=" + json;
    },

    subUIDisabled() {
      this.node.getChildByName("saveWindow").active = false;
      this.node.getChildByName("positionResetButton").active = false;
      
      this.closeDetailView();
    },

    getHitWall(point) {
      const map = this.node.getChildByName("map");
      const children = map.getChildren().filter(x => x.type == Type.WALL);
      for (let i = 0; i < children.length; i++) {
        const box = children[i].getComponent(cc.BoxCollider).world.points;
        if (cc.Intersection.pointInPolygon(point, box)) {
          return children[i];
        }
      }
      return null;
    },

    removeObject(point) {
      const wall = this.getHitWall(point)
      if (wall) {
        wall.removeFromParent();
        return;
      }

      const map = this.node.getChildByName("map");
      const pointOnMap = map.convertToNodeSpace(point);
      const discretePoint = this.getNearlyPosition(pointOnMap, FLOOR_SPAN);
      const floor = this.getfloor(discretePoint);
      if (floor) {
        const children = floor.getChildren().reverse();
        if (children.length > 0) {
          children[0].removeFromParent();
          this.save();
          return;
        }
        floor.removeFromParent();
        this.save();
      }
    },

    onTapChangeRemoveMode() {
      if (this._cannotAction) {
        return;
      }

      this.node.targetOff(this);
      this.subUIDisabled();
      this.setStateLabel("remove");

      this.node.on(cc.Node.EventType.TOUCH_START, (event) => {
        if (this._cannotAction) {
          return;
        }

        this.removeObject(event.getLocation());
      }, this);
    },

    showDetailFloor(point) {
      const map = this.node.getChildByName("map");
      const pointOnMap = map.convertToNodeSpace(point);
      const discretePoint = this.getNearlyPosition(pointOnMap, FLOOR_SPAN);
      const floor = this.getfloor(discretePoint);

      if (floor) {
        this.showDetailView(floor, false);
      }
    },

    onTapChangeDetailMode() {
      if (this._cannotAction) {
        return;
      }

      this.node.targetOff(this);
      this.subUIDisabled();
      this.setStateLabel("detail");

      this.node.on(cc.Node.EventType.TOUCH_START, (event) => {
        if (this._cannotAction) {
          return;
        }

        this.showDetailFloor(event.getLocation());
      }, this);
    },

    save() {
      let json = this.convertJson();
      if (!json || json == "[]") {
        return;
      }

      if (!isDebug()) {
        json = Base64.toBase64(RawDeflate.deflate(Base64.utob(json)));
      }

      cc.sys.localStorage.setItem(this._fileName, json);
    },

    getPrefabByType(type) {
      switch (type) {
        case Type.FLOOR:
          return this.floorPrefab;
        case Type.WALL:
          return this.wallPrefab;
        case Type.ENEMY:
          return this.enemyPrefab;
        case Type.ITEM:
          return this.itemPrefab;
        case Type.STAIRS:
          return this.stairsPrefab;
        case Type.TRAP:
          return this.trapPrefab;
      }
      
      return null;
    },

    convertMap(saveData) {
      const addChildren = (parent, children) => {
        for (let i = 0; i < children.length; i++) {
          parent.addChild(children[i]);
          if (children[i].type != Type.FLOOR && children[i].type != Type.WALL) {
            const size = children[i].getContentSize();
            children[i].setContentSize(size.width * Math.pow(1 / 2, i), size.height * Math.pow(1 / 2, i));
          }
        }
      };

      const mapFunc = (data) => {
        const prefab = this.getPrefabByType(data.type);
        const node = cc.instantiate(prefab);
        node.interId = data.id;
        node.type = data.type;
        node.position = data.position;
        node.angle = data.angle;
        const children = data.children.map(mapFunc);
        addChildren(node, children);
        return node;
      };

      const map = this.node.getChildByName("map");

      let json = saveData;
      if (!isDebug()) {
        json = Base64.btou(RawDeflate.inflate(Base64.fromBase64(json)));
      }

      if (!json || json == "[]") {
        return;
      }
      const data = JSON.parse(json).map(mapFunc);
      addChildren(map, data);
    },

    onTapStartOk() {
      const startMenu = this.node.getChildByName("startMenu");
      const editBox = startMenu.getChildByName("editBox").getComponent(cc.EditBox);
      this._fileName = editBox.string || "map";

      if (this._fileName) {
        const data = cc.sys.localStorage.getItem(this._fileName);
        if (data) {
          this.convertMap(data);
        }
      }

      startMenu.active = false;
      const ui = this.node.getChildByName("ui");
      ui.active = true;
      ui.getChildByName("mapNameLabel").getComponent(cc.Label).string = this._fileName;
    },

    setUIButtonEnabled(enabled) {
      const ui = this.node.getChildByName("ui");
      const children = ui.getChildren();
      for (let i = 0; i < children.length; i++) {
        const button = children[i].getComponent(cc.Button);
        if (button) {
          button.interactable = enabled;
        }
      }
    },

    createDetailPanel(node) {
      const detailPanel = cc.instantiate(this.detailPanelPrefab);
      
      const typePrefab = this.getPrefabByType(node.type);
      const typeNode = cc.instantiate(typePrefab);
      typeNode.position = cc.v2(0, 0);
      detailPanel.getChildByName("type").addChild(typeNode);
      detailPanel.getChildByName("nameLabel").getComponent(cc.Label).string = typePrefab.data.name;
      detailPanel.targetNode = node;

      const idNode = detailPanel.getChildByName("id");
      const idEditBox = detailPanel.getChildByName("id").getChildByName("idEditBox");
      idEditBox.getComponent(cc.EditBox).string = node.interId === undefined ? -1 : node.interId;
      idNode.active = node.type != Type.FLOOR;

      return detailPanel;
    },

    showDetailView(node, cannotAction = true) {
      const children = node.getChildren();
      if (children.length <= 0) {
        return;
      }

      const mark = this.node.getChildByName("mark");
      mark.active = true;
      mark.position = node.position.add(node.parent.position);

      const detailView = this.node.getChildByName("detailView");
      detailView.active = true;
      const content = detailView.getComponent(cc.ScrollView).content;
      content.removeAllChildren();

      let detailPanel = this.createDetailPanel(node);
      detailPanel.position = cc.v2(0, -20);
      content.addChild(detailPanel);

      for (let i = 0; i < children.length; i++) {
        detailPanel = this.createDetailPanel(children[i]);
        detailPanel.position = cc.v2(0, -i * (detailPanel.height + 10) - 20);
        content.addChild(detailPanel);
      }

      if (cannotAction) {
        this.node.getChildByName("viewBackground").active = true;
        this.setUIButtonEnabled(false);
        this._cannotAction = true;
      }
    },

    onTapDetailSave() {
      const detailView = this.node.getChildByName("detailView");
      const content = detailView.getComponent(cc.ScrollView).content;
      const children = content.getChildren();

      for (let i = 0; i < children.length; i++) {
        const detailPanel = children[i];
        const idEditBox = detailPanel.getChildByName("id").getChildByName("idEditBox");
        detailPanel.targetNode.interId = Number(idEditBox.getComponent(cc.EditBox).string);
      }

      this.save();
      this.closeDetailView();
    },

    closeDetailView() {
      this.node.getChildByName("detailView").active = false;
      this.node.getChildByName("mark").active = false;

      if (this._cannotAction) {
        this._cannotAction = false;
        this.setUIButtonEnabled(true);
        this.node.getChildByName("viewBackground").active = false;
      }
    },

    onTapSpecialView() {
      const specialView = this.node.getChildByName("specialView");
      
      this.setUIButtonEnabled(false);
      this.node.getChildByName("viewBackground").active = true;
      specialView.active = true;
      this._cannotAction = true;
    },

    onTapCloseSpecialView() {
      const specialView = this.node.getChildByName("specialView");
      
      this.setUIButtonEnabled(true);
      this.node.getChildByName("viewBackground").active = false;
      specialView.active = false;
      this._cannotAction = false;
    },

    onTapRemoveMap() {
      cc.sys.localStorage.removeItem(this._fileName);
      const map = this.node.getChildByName("map");
      map.removeAllChildren();
      this.onTapCloseSpecialView();
    },

    onLoad () {
      const manager = cc.director.getCollisionManager();
      manager.enabled = true;
    },

    start () {
      this._isTouch = false;
    },

    update (dt) {},
});
