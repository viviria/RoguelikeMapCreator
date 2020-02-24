const TileType = cc.Enum({
  FLOOR: 0,
  WALL: 1,
  WATER: 2,
  NUM: 3,
});

const EventObjectType = cc.Enum({
  ENEMY: 0,
  ITEM: 1,
  STAIRS: 2,
  TRAP: 3,
});

const Mode = cc.Enum({
  NONE: 0,
  MOVE: 1,
  TILE: 2,
  ENEMY: 3,
  ITEM: 4,
  STAIRS: 5,
  TRAP: 6,
});

const TILE_SPAN = 50;

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

      waterPrefab: {
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

      tileTypePanelPrefab: {
        type: cc.Prefab,
        default: null,
      },

      _isTouch: false,
      _fileName: "map",
      _cannotAction: false,

      _mode: Mode.NONE,
      _tileType: TileType.FLOOR,
    },

    setStateLabel(state) {
      this.node.getChildByName("stateLabel").getComponent(cc.Label).string = state;
    },

    changeMode(touchStart, touchMove, touchEnd) {
      if (this._cannotAction) {
        return;
      }

      this.node.targetOff(this);
      this.subUIDisabled();

      this.node.on(cc.Node.EventType.TOUCH_START, (event) => {
        if (this._cannotAction) {
          return;
        }
        this._isTouch = true;
        if (touchStart) {
          touchStart(event.getLocation());
        }
      }, this);

      this.node.on(cc.Node.EventType.TOUCH_MOVE, (event) => {
        if (this._isTouch) {
          if (touchMove) {
            touchMove(event.getLocation());
          }
        }
      }, this);

      const touchEndCallback = (event) => {
        if (this._isTouch && touchEnd) {
          touchEnd();
        }
        this._isTouch = false;
      }

      this.node.on(cc.Node.EventType.TOUCH_END, touchEndCallback, this);
      this.node.on(cc.Node.EventType.TOUCH_CANCEL, touchEndCallback, this);
    },

    onTapChangeMode(event, data) {
      this._mode = Number(data);

      switch (this._mode) {
        case Mode.MOVE:
          this.setStateLabel("move");
          this.changeMoveMode();
          break;
        case Mode.TILE:
          this.setStateLabel("tile");
          this.changeTileMode();
          break;
        case Mode.ENEMY:
          this.setStateLabel("enemy");
          this.changeEventObjectMode(EventObjectType.ENEMY);
        case Mode.ITEM:
          this.setStateLabel("item");
          this.changeEventObjectMode(EventObjectType.ITEM);
          break;
        case Mode.STAIRS:
          this.setStateLabel("stairs");
          this.changeEventObjectMode(EventObjectType.STAIRS);
          break;
        case Mode.TRAP:
          this.setStateLabel("trap");
          this.changeEventObjectMode(EventObjectType.TRAP);
          break;
      }
    },

    changeMoveMode() {
      const map = this.node.getChildByName("map");
      let prevPoint = null;

      this.changeMode(
        (point) => {
          prevPoint = point;
        },
        (point) => {
          const nowPoint = point;
          map.position = map.position.add(nowPoint.sub(prevPoint));
          prevPoint = nowPoint;
        },
        () => {
          prevPoint = null;
        }
      );

      this.node.getChildByName("positionResetButton").active = true;
    },

    changeTileMode() {
      this.changeMode(
        (point) => {
          this.generateTile(point, this._tileType);
        },
        (point) => {
          this.generateTile(point, this._tileType);
        },
        () => {
          this.save();
        }
      );
      
      this.createTileTypeView();
    },

    getTileTypeName(tileType) {
      switch (tileType) {
        case TileType.FLOOR:
          return "floor";
        case TileType.WALL:
          return "wall";
        case TileType.WATER:
          return "water";
      }
      return "";
    },

    onTapSetTileType(event, data) {
      const tileType = Number(data);
      this._tileType = tileType;
    },

    instantiateTileTypePanel(tileType) {
      const node = cc.instantiate(this.tileTypePanelPrefab);
      node.getChildByName("typeLabel").getComponent(cc.Label).string = "type: " + tileType;
      node.getChildByName("name").getComponent(cc.Label).string = this.getTileTypeName(tileType);

      const typeNode = this.instantiateTile(tileType);
      typeNode.position = cc.v2(0, 0);
      node.getChildByName("type").addChild(typeNode);

      const button = node.getComponent(cc.Button);
      const clickEvent = new cc.Component.EventHandler();
      clickEvent.target = this.node;
      clickEvent.customEventData = tileType;
      clickEvent.handler = "onTapSetTileType";
      clickEvent.component = this.node.parent.name;
      button.clickEvents.push(clickEvent);

      return node;
    },

    createTileTypeView() {
      const tileTypeView = this.node.getChildByName("tileTypeView");
      tileTypeView.active = true;
      const content = tileTypeView.getComponent(cc.ScrollView).content;
      content.removeAllChildren();

      let height = 0;
      for (let i = 0; i < TileType.NUM; i++) {
        const panel = this.instantiateTileTypePanel(i);
        const span = panel.height + 10;
        height += span;
        panel.position = cc.v2(0, -i * span - 20);
        content.addChild(panel);
      }

      content.height = height + 40;
    },

    changeEventObjectMode(eventObjectType) {
      this.changeMode(
        (point) => {
          switch (eventObjectType) {
            case EventObjectType.ENEMY:
              this.generateEventObject(
                point,
                EventObjectType.ENEMY,
                [EventObjectType.ENEMY],
                [EventObjectType.ITEM, EventObjectType.STAIRS, EventObjectType.TRAP]
              );
            break;
            case EventObjectType.ITEM:
              this.generateEventObject(
                point,
                EventObjectType.ITEM,
                [EventObjectType.ITEM, EventObjectType.STAIRS],
                [EventObjectType.ENEMY, EventObjectType.TRAP]
              );
            break;
            case EventObjectType.STAIRS:
              this.generateEventObject(
                point,
                EventObjectType.STAIRS,
                [EventObjectType.STAIRS, EventObjectType.ITEM, EventObjectType.TRAP],
                [EventObjectType.ENEMY]
              );
            break;
            case EventObjectType.TRAP:
              this.generateEventObject(
                point,
                EventObjectType.TRAP,
                [EventObjectType.TRAP, EventObjectType.STAIRS],
                [EventObjectType.ENEMY, EventObjectType.ITEM]
              );
            break;
          }
        }
      );
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

    isAlreadyPutTile(point) {
      const map = this.node.getChildByName("map");
      const children = map.getChildren();
      for (let i = 0; i < children.length; i++) {
        if (children[i].x == point.x && children[i].y == point.y) {
          return true;
        }
      }
      return false;
    },

    instantiateTile(tileType) {
      switch (tileType) {
        case TileType.FLOOR:
          return cc.instantiate(this.floorPrefab);
        case TileType.WALL:
          return cc.instantiate(this.wallPrefab);
        case TileType.WATER:
          return cc.instantiate(this.waterPrefab);
      }
      return null;
    },

    generateTile(point, tileType) {
      const map = this.node.getChildByName("map");
      const discretePoint = this.getNearlyPosition(map.convertToNodeSpace(point), TILE_SPAN);
      if (this.isAlreadyPutTile(discretePoint)) {
        return;
      }

      const tile = this.instantiateTile(tileType);
      tile.interId = tileType;
      tile.type = tileType;
      tile.position = discretePoint;
      map.addChild(tile);
    },

    getTile(point) {
      const map = this.node.getChildByName("map");
      const children = map.getChildren();
      for (let i = 0; i < children.length; i++) {
        if (children[i].x == point.x && children[i].y == point.y) {
          return children[i];
        }
      }
      return null;
    },

    isAlreadyPutTypeOnTile(tile, types) {
      const children = tile.getChildren().filter(x => types.indexOf(x.type) >= 0);
      return children.length > 0;
    },

    instantiateEventObject(eventObjectType) {
      switch (eventObjectType) {
        case EventObjectType.ITEM:
          return cc.instantiate(this.itemPrefab);
        case EventObjectType.ENEMY:
          return cc.instantiate(this.enemyPrefab);
        case EventObjectType.STAIRS:
          return cc.instantiate(this.stairsPrefab);
        case EventObjectType.TRAP:
          return cc.instantiate(this.trapPrefab);
      }
      return null;
    },

    generateEventObject(point, eventObjectType, alreadyCannnotPutType, alreadyCannPutType) {
      const map = this.node.getChildByName("map");
      const pointOnMap = map.convertToNodeSpace(point);
      const discretePoint = this.getNearlyPosition(pointOnMap, TILE_SPAN);
      const tile = this.getTile(discretePoint);
      if (!tile || tile.type == TileType.WALL) {
        return;
      }

      if (this.isAlreadyPutTypeOnTile(tile, alreadyCannnotPutType)) {
        return;
      }

      const eventObject = this.instantiateEventObject(eventObjectType);
      eventObject.type = eventObjectType;
      eventObject.position = cc.v2(0, 0);

      if (this.isAlreadyPutTypeOnTile(tile, alreadyCannPutType)) {
        eventObject.setContentSize(10, 10);
      }
      
      tile.addChild(eventObject);
      this.showDetailView(tile);
    },

    convertJson() {
      const map = this.node.getChildByName("map");
      const func = x => {
        return {
          id: x.interId,
          type: x.type,
          position: x.position,
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
      this.node.getChildByName("tileTypeView").active = false;
      
      this.closeDetailView();
    },

    removeObject(point) {
      const map = this.node.getChildByName("map");
      const pointOnMap = map.convertToNodeSpace(point);
      const discretePoint = this.getNearlyPosition(pointOnMap, TILE_SPAN);
      const tile = this.getTile(discretePoint);
      if (tile) {
        const children = tile.getChildren().reverse();
        if (children.length > 0) {
          children[0].removeFromParent();
          this.save();
          return;
        }
        tile.removeFromParent();
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

    showDetailTile(point) {
      const map = this.node.getChildByName("map");
      const pointOnMap = map.convertToNodeSpace(point);
      const discretePoint = this.getNearlyPosition(pointOnMap, TILE_SPAN);
      const tile = this.getTile(discretePoint);

      if (tile) {
        this.showDetailView(tile, false);
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

        this.showDetailTile(event.getLocation());
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

    convertMap(saveData) {
      const addChildren = (parent, children, isResize = false) => {
        for (let i = 0; i < children.length; i++) {
          parent.addChild(children[i]);
          if (isResize) {
            const size = children[i].getContentSize();
            children[i].setContentSize(size.width * Math.pow(1 / 2, i), size.height * Math.pow(1 / 2, i));
          }
        }
      };

      const setData = (node, data) => {
        node.interId = data.id;
        node.type = data.type;
        node.position = data.position;
      };

      const eventObjectMapFunc = (data) => {
        const node = this.instantiateEventObject(data.type);
        setData(node, data);
        const children = data.children.map(eventObjectMapFunc);
        addChildren(node, children, true);
        return node;
      };

      const mapFunc = (data) => {
        const node = this.instantiateTile(data.type);
        setData(node, data);
        const children = data.children.map(eventObjectMapFunc);
        addChildren(node, children, true);
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

    createDetailPanel(node, isTile = false) {
      const detailPanel = cc.instantiate(this.detailPanelPrefab);
      
      const typeNode = isTile ? this.instantiateTile(node.type) : this.instantiateEventObject(node.type);
      typeNode.position = cc.v2(0, 0);
      detailPanel.getChildByName("symbol").addChild(typeNode);
      detailPanel.getChildByName("nameLabel").getComponent(cc.Label).string = typeNode.name;
      detailPanel.targetNode = node;
      detailPanel.isTile = isTile;

      const detail = detailPanel.getChildByName(isTile ? "type" : "id");
      const editBox = detail.getChildByName("editBox");
      editBox.getComponent(cc.EditBox).string = node.interId === undefined ? -1 : node.interId;
      detail.active = true;

      return detailPanel;
    },

    showDetailView(node, cannotAction = true) {
      const children = node.getChildren();
      const mark = this.node.getChildByName("mark");
      mark.active = true;
      mark.position = node.position.add(node.parent.position);

      const detailView = this.node.getChildByName("detailView");
      detailView.active = true;
      const content = detailView.getComponent(cc.ScrollView).content;
      content.removeAllChildren();

      let detailPanel = this.createDetailPanel(node, true);
      detailPanel.position = cc.v2(0, -20);
      content.addChild(detailPanel);

      for (let i = 0; i < children.length; i++) {
        detailPanel = this.createDetailPanel(children[i]);
        detailPanel.position = cc.v2(0, -(i + 1) * (detailPanel.height + 10) - 20);
        content.addChild(detailPanel);
      }

      if (cannotAction) {
        this.node.getChildByName("viewBackground").active = true;
        this.setUIButtonEnabled(false);
        this._cannotAction = true;
      }
    },

    onTapSaveDetail() {
      const detailView = this.node.getChildByName("detailView");
      const content = detailView.getComponent(cc.ScrollView).content;
      const children = content.getChildren();

      const changeTile = (orignalNode, type) => {
        const node = this.instantiateTile(type);
        if (!node) {
          return;
        }

        const children = orignalNode.getChildren();
        const length = children.length;
        for (let i = 0; i < length; i++) {
          const child = children[0];
          child.removeFromParent();
          node.addChild(child);
        }
        node.interId = node.type = type;
        node.position = orignalNode.position;
        orignalNode.removeFromParent();
        
        const map = this.node.getChildByName("map");
        map.addChild(node);
      };

      for (let i = 0; i < children.length; i++) {
        const detailPanel = children[i];
        const editBox = detailPanel.getChildByName(detailPanel.isTile ? "type" : "id").getChildByName("editBox");
        if (isNaN(editBox.getComponent(cc.EditBox).string)) {
          return;
        }
      }

      for (let i = 0; i < children.length; i++) {
        const detailPanel = children[i];
        if (detailPanel.isTile) {
          const editBox = detailPanel.getChildByName("type").getChildByName("editBox");
          const type = Number(editBox.getComponent(cc.EditBox).string);
          changeTile(detailPanel.targetNode, type);
        } else {
          const editBox = detailPanel.getChildByName("id").getChildByName("editBox");
          detailPanel.targetNode.interId = Number(editBox.getComponent(cc.EditBox).string);
        }
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
